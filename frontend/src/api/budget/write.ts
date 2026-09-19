import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api'
import type { BudgetDetail, BudgetUpdate } from '@/types'
import { budgetKey } from './detail'
import { useBudgetId } from './context'

export const writeKey = ['budget-write'] as const

/** Replies can land out of order; only the newest write writes the cache. */
let writeCounter = 0

/**
 * Collapses a burst of edits to one field into as few writes as possible,
 * without making any of them wait.
 *
 * The first edit goes at once, so a single change is as quick as the server
 * is. While it is in flight the ones behind it pile onto a single slot, and
 * only the newest survives -- it carries the value the older ones were heading
 * for. Typing therefore costs two writes rather than one per keystroke, and
 * nothing is delayed on the chance that more is coming.
 */
const slots = new Map<
  string,
  { busy: boolean; next?: () => Promise<unknown> }
>()

function coalesced(key: string, fire: () => Promise<unknown>) {
  const slot = slots.get(key) ?? { busy: false }
  slots.set(key, slot)

  if (slot.busy) {
    slot.next = fire
    return
  }

  slot.busy = true
  void fire().finally(() => {
    slot.busy = false
    const next = slot.next
    slot.next = undefined
    if (next) coalesced(key, next)
  })
}

/** Serialises every write to one budget, edits and whole rows alike. */
export const writeScope = (budgetId: number) => ({
  id: `budget-write-${budgetId}`,
})

/**
 * One field of the saved budget. The API takes a single field at a time, so a
 * change that moves several — picking an employment type that invalidates the
 * time basis, say — becomes several of these, applied in order.
 */
export type Command = BudgetUpdate

/**
 * What the screen should show for the fields the engine does not recompute.
 *
 * A PATCH that needs no calculation answers 204, so there is nothing to put in
 * the cache; and even when it answers 200, the reply was composed before any
 * later keystroke. Applying the echo on top of whatever comes back covers both.
 */
export type Echo = (budget: BudgetDetail) => BudgetDetail

const identity: Echo = (budget) => budget

async function patch(
  budgetId: number,
  command: Command,
): Promise<BudgetDetail | null> {
  const { data, error, response } = await api.PATCH(
    '/api/budgets/{budget_id}/',
    { params: { path: { budget_id: budgetId } }, body: command },
  )
  if (error) throw new ApiError(response.status, error)
  // 204: saved, nothing recalculated.
  return response.status === 204 ? null : (data as BudgetDetail)
}

/**
 * The fields of the PATCH envelope itself, rather than of the budget.
 *
 * A complaint about `field` or `row_id` is about the request this app built,
 * not about anything the reader typed, so its name is not worth showing them.
 */
const ENVELOPE = new Set(['section', 'field', 'value', 'row_id', 'year'])

/** chief_investigator -> "Chief investigator". The API names a field in the
 *  model's words; a reader should see it in their own. */
const asLabel = (attr: string) =>
  attr.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase())

const describe = (error: unknown) => {
  if (!(error instanceof ApiError)) return null
  const fields = Object.entries(error.fields)
  if (fields.length === 0) return error.message
  return fields
    .map(([attr, message]) =>
      ENVELOPE.has(attr) ? message : `${asLabel(attr)}: ${message}`,
    )
    .join('\n')
}

/**
 * The row a command was aimed at, named as the table names it.
 *
 * Read from the budget the screen is showing, because the server answers with
 * a row id and the reader has never seen one.
 */
export function rowLabel(
  budget: BudgetDetail | undefined,
  command: Command | undefined,
): string | undefined {
  if (!budget || !command || !('row_id' in command)) return undefined
  const id = command.row_id

  if (command.section === 'staff') {
    const line = [
      ...budget.staff_cost.lines,
      ...budget.staff_in_kind_cost.lines,
    ].find((row) => row.id === id)
    return line?.name_role?.trim() || 'A staff row'
  }

  if (command.section === 'non_staff') {
    const line = [
      ...budget.non_staff_cost.lines,
      ...budget.non_staff_in_kind_cost.lines,
    ].find((row) => row.id === id)
    return line?.description?.trim() || line?.expense_type || 'A non-staff row'
  }

  if (command.section === 'deliverable') {
    const row = budget.budget_info.deliverables.find((item) => item.id === id)
    return row?.description?.trim() || `Deliverable ${row?.number ?? ''}`.trim()
  }

  return undefined
}

/**
 * Says what was refused, and where it was.
 *
 * `where` is the row as it reads on screen -- a person's name, a description --
 * because a reader has no way to find "row_id 14", and the server has no way
 * to know what the row is called.
 */
export function reportWriteError(error: unknown, where?: string) {
  const description = describe(error)
  const title = where
    ? `${where}: some of your changes were not saved`
    : 'Some of your changes were not saved'
  if (description) {
    toast.error(title, {
      id: 'budget-write',
      description,
    })
    return
  }
  toast.error('Could not save your changes', {
    id: 'budget-write',
    description: 'Please try again',
  })
}

/**
 * Applies edits to the saved budget.
 *
 * The cache moves first so typing never waits on a round trip, then the reply
 * replaces it. A reply that is already out of date is dropped rather than
 * written over newer typing.
 */
export function useEdit() {
  const budgetId = useBudgetId()
  const queryClient = useQueryClient()
  const key = budgetKey(budgetId)

  const write = useMutation({
    mutationKey: writeKey,
    // One budget's writes run one at a time. Sent in parallel they could reach
    // the server out of order, and the last one to arrive is the one stored.
    scope: writeScope(budgetId),
    mutationFn: async ({
      commands,
    }: {
      commands: Command[]
      echo: Echo
      issued: number
    }) => {
      let latest: BudgetDetail | null = null
      for (const command of commands) {
        latest = (await patch(budgetId, command)) ?? latest
      }
      return latest
    },
    onSuccess: (detail, { echo, issued }) => {
      // A reply composed before a later keystroke must not undo it.
      if (detail === null || issued !== writeCounter) return
      queryClient.setQueryData(key, echo(detail))
    },
    onError: (error, { commands }) => {
      const budget = queryClient.getQueryData<BudgetDetail>(key)
      reportWriteError(error, rowLabel(budget, commands[0]))
      // The cache is holding an optimistic echo that the server rejected.
      queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return (commands: Command[], echo: Echo = identity, coalesce?: string) => {
    if (commands.length === 0) return

    // The screen moves now, whatever the network does next.
    queryClient.setQueryData(key, (budget?: BudgetDetail) =>
      budget ? echo(budget) : budget,
    )

    const send = () => {
      const issued = ++writeCounter
      // onError already reports; catch only so the rejection is not unhandled.
      return write
        .mutateAsync({ commands, echo, issued })
        .catch(() => undefined)
    }

    if (coalesce === undefined) {
      void send()
      return
    }

    coalesced(`${budgetId}:${coalesce}`, send)
  }
}

/** True while any edit is in flight. */
export const useSaving = () => useIsMutating({ mutationKey: writeKey }) > 0
