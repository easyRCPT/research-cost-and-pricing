import { useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useLookups } from '@/api/lookups'
import { useApplyChanges, useLookupVersions, type ChangesApplied } from '@/api/admin-lookups'
import { Grid, PageHead, Panel, Td, Th } from '@/components/shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { RATE_TABLES, tableSpec, type RateTableSpec } from './rateTables'
import {
  countText,
  idOf,
  keyOf,
  keyText,
  refusedChange,
  stagedId,
  toRequest,
  upsert,
  without,
  type Key,
  type Row,
  type Staged,
} from './stagedChanges'
import { VersionsPanel, type RatesMoved } from './VersionsPanel'

type Refused = { id: string; message: string } | null

/**
 * The rates that price a costing, edited as one reviewed set (#138).
 *
 * Edits are held on screen, across every tab, until they are reviewed and
 * saved in one request, which the server applies all at once or not at all.
 * Saving a row at a time, a costing submitted while an administrator was
 * partway through a many-row change was frozen onto half of it for good.
 *
 * A set goes into the current version until a costing is submitted on it; the
 * first set after that starts a new version, so a submitted costing keeps the
 * rates it was submitted with. Any older set can be put back from the
 * versions panel (#137).
 */
export function LookupEditor() {
  const { data: lookups } = useLookups()
  const [tableId, setTableId] = useState(RATE_TABLES[0].id)
  const [staged, setStaged] = useState<Staged[]>([])
  const [refused, setRefused] = useState<Refused>(null)
  const [reviewing, setReviewing] = useState(false)
  const [moved, setMoved] = useState<RatesMoved | null>(null)
  const [shownVersion, setShownVersion] = useState<number | null>(null)

  const spec = tableSpec(tableId)
  const rows = (lookups[spec.id] ?? []) as unknown as Row[]

  // Every staged change is the set's, so any edit may clear the refusal.
  const stage = (next: Staged[]) => {
    setStaged(next)
    setRefused(null)
    if (next.length === 0) setReviewing(false)
  }

  const blocker = useBlocker({
    shouldBlockFn: () => true,
    disabled: staged.length === 0,
    enableBeforeUnload: () => staged.length > 0,
    withResolver: true,
  })

  const seeVersion = (versionId: number) => {
    setShownVersion(versionId)
    requestAnimationFrame(() =>
      document.getElementById(`version-${versionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }

  const onSaved = (saved: ChangesApplied, count: number) => {
    const done = {
      title: `${count} ${count === 1 ? 'change' : 'changes'} saved`,
      description: saved.new_version
        ? `They started version #${saved.version_id}.`
        : `They went into version #${saved.version_id}.`,
      replaced: saved.replaced,
    }
    setStaged([])
    setReviewing(false)
    setMoved(done)
    toast.success(done.title, { description: done.description })
  }

  const onRefused = (error: unknown) => {
    const which = refusedChange(error, staged)
    setRefused(which)
    setReviewing(false)
    if (which) setTableId(staged.find((change) => idOf(change) === which.id)!.table)
    toast.error('Nothing was saved', {
      description: error instanceof ApiError ? error.message : 'Try again.',
    })
  }

  return (
    <>
      <PageHead title="Lookup tables" subtitle="The rates every costing is priced with" />

      {moved ? (
        <RatesMovedNotice moved={moved} onSee={seeVersion} onDismiss={() => setMoved(null)} />
      ) : (
        <Alert className="mb-4">
          <AlertDescription>
            Changes are held here until you review and save them, and then
            apply all at once. Saved changes reprice every draft and every new
            costing straight away. Costings already submitted keep the rates
            they were submitted with, and any earlier set of rates can be put
            back below.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={spec.id} onValueChange={(next) => setTableId(next as typeof tableId)}>
        <TabsList className="mb-4 flex-wrap">
          {RATE_TABLES.map((table) => {
            const changes = staged.filter((change) => change.table === table.id).length
            return (
              <TabsTrigger key={table.id} value={table.id}>
                {table.label}
                {changes > 0 && (
                  <Badge className="ml-1.5" aria-label={`${changes} unsaved`}>
                    {changes}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <Panel title={spec.label}>
        <RateTable spec={spec} rows={rows} staged={staged} refused={refused} onStage={stage} />
        {spec.addable !== false && (
          <AddRow
            key={spec.id}
            spec={spec}
            onAdd={(key, value) => stage(upsert(staged, { op: 'create', table: spec.id, key, value }))}
          />
        )}
      </Panel>

      {staged.length > 0 &&
        (reviewing ? (
          <Review
            staged={staged}
            onBack={() => setReviewing(false)}
            onSaved={onSaved}
            onRefused={onRefused}
          />
        ) : (
          <ChangeBar
            staged={staged}
            onDiscard={() => stage([])}
            onReview={() => setReviewing(true)}
          />
        ))}

      {blocker.status === 'blocked' && (
        <div
          role="alertdialog"
          aria-label="Unsaved changes"
          className="sticky bottom-4 z-10 mt-4 rounded-md border border-destructive/30 bg-card px-4 py-3 text-[13px] shadow-lg"
        >
          <p className="font-semibold text-destructive">Leave without saving?</p>
          <p className="mt-1">
            {countText(staged)} {staged.length === 1 ? 'has' : 'have'} not been saved, and will be lost.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" onClick={blocker.proceed}>
              Leave without saving
            </Button>
            <Button size="sm" variant="ghost" onClick={blocker.reset}>
              Stay
            </Button>
          </div>
        </div>
      )}

      <VersionsPanel
        shown={shownVersion}
        onShow={setShownVersion}
        onRestored={(restored) => {
          setMoved(restored)
          toast.success(restored.title, { description: restored.description })
        }}
      />
    </>
  )
}

function RateTable({
  spec,
  rows,
  staged,
  refused,
  onStage,
}: {
  spec: RateTableSpec
  rows: Row[]
  staged: Staged[]
  refused: Refused
  onStage: (next: Staged[]) => void
}) {
  const ofTable = staged.filter((change) => change.table === spec.id)
  const added = ofTable.filter((change) => change.op === 'create')

  return (
    <Grid>
      <thead>
        <tr>
          {spec.key.map((k) => (
            <Th key={k.field}>{k.label}</Th>
          ))}
          <Th className="text-right">{spec.value.label}</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = keyOf(spec, row)
          const id = stagedId(spec.id, key)
          const saved = Number(row[spec.value.field])
          const change = ofTable.find((existing) => idOf(existing) === id)
          return (
            <RateRow
              key={id}
              spec={spec}
              rowKey={key}
              value={change?.op === 'update' ? change.value : saved}
              was={change?.op === 'update' ? saved : null}
              removed={change?.op === 'delete'}
              refusal={refused?.id === id ? refused.message : null}
              onChange={(value) =>
                onStage(
                  value === saved
                    ? without(staged, id)
                    : upsert(staged, { op: 'update', table: spec.id, key, was: saved, value }),
                )
              }
              onRemove={
                spec.removable === false
                  ? undefined
                  : () => onStage(upsert(staged, { op: 'delete', table: spec.id, key, was: saved }))
              }
              onUndo={() => onStage(without(staged, id))}
            />
          )
        })}
        {added.map((change) => {
          const id = idOf(change)
          return (
            <RateRow
              key={`new-${id}`}
              spec={spec}
              rowKey={change.key}
              value={change.value}
              added
              refusal={refused?.id === id ? refused.message : null}
              onChange={(value) => onStage(upsert(staged, { ...change, value }))}
              onUndo={() => onStage(without(staged, id))}
            />
          )
        })}
      </tbody>
    </Grid>
  )
}

function RateRow({
  spec,
  rowKey,
  value,
  was = null,
  added = false,
  removed = false,
  refusal,
  onChange,
  onRemove,
  onUndo,
}: {
  spec: RateTableSpec
  rowKey: Key
  value: number
  was?: number | null
  added?: boolean
  removed?: boolean
  refusal: string | null
  onChange: (value: number) => void
  onRemove?: () => void
  onUndo: () => void
}) {
  const name = keyText(spec, rowKey)
  const changed = was !== null || added || removed

  return (
    <tr
      className={cn(
        changed && 'bg-amber-50',
        removed && 'text-muted-foreground',
        refusal && 'bg-destructive/10',
      )}
      aria-invalid={refusal ? true : undefined}
    >
      {spec.key.map((k, i) => (
        <Td key={k.field}>
          <span className={cn(removed && 'line-through')}>
            {rowKey[k.field] === null || rowKey[k.field] === '' ? '—' : String(rowKey[k.field])}
          </span>
          {i === 0 && added && <Badge variant="secondary" className="ml-2">New</Badge>}
          {i === 0 && removed && <Badge variant="destructive" className="ml-2">Removed</Badge>}
          {i === 0 && refusal && <div className="mt-0.5 text-[12px] text-destructive">{refusal}</div>}
        </Td>
      ))}
      <Td className="text-right">
        {removed ? (
          <span className="tabular line-through">{value}</span>
        ) : (
          <NumberInput
            className="tabular ml-auto h-8 w-36 text-right"
            step={spec.value.step}
            min={0}
            value={value}
            onChange={onChange}
            aria-label={`${spec.value.label} for ${name}`}
          />
        )}
        {was !== null && <div className="tabular mt-0.5 text-[11.5px] text-muted-foreground">was {was}</div>}
      </Td>
      <Td className="w-40">
        {changed ? (
          <Button size="sm" variant="ghost" onClick={onUndo} aria-label={`Undo the change to ${name}`}>
            Undo
          </Button>
        ) : (
          onRemove && (
            <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${name}`}>
              Remove
            </Button>
          )
        )}
      </Td>
    </tr>
  )
}

function AddRow({ spec, onAdd }: { spec: RateTableSpec; onAdd: (key: Key, value: number) => void }) {
  const blank = () => Object.fromEntries([...spec.key.map((k) => [k.field, '']), [spec.value.field, '']])
  const [values, setValues] = useState<Record<string, string>>(blank)
  const ready = spec.key.every((k) => k.kind === 'number' || values[k.field]?.trim()) && values[spec.value.field] !== ''

  const add = () => {
    const key: Key = {}
    for (const k of spec.key) {
      const raw = values[k.field]?.trim() ?? ''
      key[k.field] = k.kind === 'number' ? (raw === '' ? null : Number(raw)) : raw || null
    }
    onAdd(key, Number(values[spec.value.field]))
    setValues(blank())
  }

  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-[13px] font-medium">Add a row</div>
      <div className="flex flex-wrap items-end gap-3">
        {[...spec.key, { field: spec.value.field, label: spec.value.label, kind: 'number' as const }].map((k) => (
          <label key={k.field} className="grid gap-1 text-[12px] text-muted-foreground">
            {k.label}
            <Input
              className="h-8 w-40"
              type={k.kind === 'number' ? 'number' : 'text'}
              value={values[k.field] ?? ''}
              onChange={(event) => setValues({ ...values, [k.field]: event.target.value })}
            />
          </label>
        ))}
        <Button size="sm" variant="outline" disabled={!ready} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  )
}

function ChangeBar({
  staged,
  onDiscard,
  onReview,
}: {
  staged: Staged[]
  onDiscard: () => void
  onReview: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-[13px] shadow-lg"
    >
      <span className="font-medium">{countText(staged)}</span>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard all
        </Button>
        <Button size="sm" onClick={onReview}>
          Review changes
        </Button>
      </div>
    </div>
  )
}

/** Every change, old → new, and where the set will go, before it is saved. */
function Review({
  staged,
  onBack,
  onSaved,
  onRefused,
}: {
  staged: Staged[]
  onBack: () => void
  onSaved: (saved: ChangesApplied, count: number) => void
  onRefused: (error: unknown) => void
}) {
  const apply = useApplyChanges()
  const { data: versions } = useLookupVersions()
  const [note, setNote] = useState('')
  const current = versions.find((version) => version.current)

  const save = () =>
    apply.mutate(
      { note: note.trim(), changes: staged.map(toRequest) },
      { onSuccess: (saved) => onSaved(saved, staged.length), onError: onRefused },
    )

  return (
    <Panel title="Review changes" className="mt-4" description={countText(staged)}>
      <div className="grid gap-4">
        {RATE_TABLES.filter((spec) => staged.some((change) => change.table === spec.id)).map((spec) => (
          <section key={spec.id} aria-label={spec.label}>
            <h4 className="mb-1 text-[13px] font-semibold">{spec.label}</h4>
            <ul className="grid gap-1 text-[13px]">
              {staged
                .filter((change) => change.table === spec.id)
                .map((change) => (
                  <li key={idOf(change)} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{keyText(spec, change.key)}</span>
                    <ChangeText change={change} label={spec.value.label} />
                  </li>
                ))}
            </ul>
          </section>
        ))}

        <label className="grid max-w-xl gap-1 text-[12.5px] text-muted-foreground">
          Note (optional)
          <Input
            value={note}
            maxLength={200}
            placeholder="For example, 2027 EBA increase"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        {current && (
          <p className="text-[13px]">
            {current.accepts_changes
              ? `Saves into version #${current.id}.`
              : `Starts a new version: costings are already priced on version #${current.id}, and they keep those rates.`}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" disabled={apply.isPending} onClick={save}>
            {apply.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button size="sm" variant="ghost" disabled={apply.isPending} onClick={onBack}>
            Keep editing
          </Button>
        </div>
      </div>
    </Panel>
  )
}

const signedPercent = (fraction: number) =>
  `${fraction > 0 ? '+' : fraction < 0 ? '−' : ''}${Math.abs(fraction * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%`

function ChangeText({ change, label }: { change: Staged; label: string }) {
  switch (change.op) {
    case 'update':
      return (
        <span className="tabular">
          {label} {change.was} → {change.value}
          {/* Shown so a slip of the keyboard (a rate 100 times too big) stands out. */}
          {change.was !== 0 && (
            <span className="ml-1.5 text-muted-foreground">({signedPercent(change.value / change.was - 1)})</span>
          )}
        </span>
      )
    case 'create':
      return (
        <span className="tabular">
          <Badge variant="secondary">Added</Badge> {label} {change.value}
        </span>
      )
    case 'delete':
      return (
        <span className="tabular">
          <Badge variant="destructive">Removed</Badge> was {change.was}
        </span>
      )
  }
}

/**
 * What a save or a restore did to the rates, and who was priced on the version
 * they moved away from (#142). Those costings keep their rates; this says what
 * can be done about each.
 */
function RatesMovedNotice({
  moved,
  onSee,
  onDismiss,
}: {
  moved: RatesMoved
  onSee: (versionId: number) => void
  onDismiss: () => void
}) {
  const replaced = moved.replaced
  const affected = replaced ? replaced.in_review + replaced.approved : 0
  const costings = (n: number) => `${n} ${n === 1 ? 'costing' : 'costings'}`

  return (
    <Alert className="mb-4" role="status">
      <AlertTitle>{moved.title}</AlertTitle>
      <AlertDescription>
        <p>{moved.description}</p>
        {replaced && affected === 0 && (
          <p>No costing in review or approved was priced on version #{replaced.version_id}, the version replaced.</p>
        )}
        {replaced && affected > 0 && (
          <div className="mt-2 grid gap-1">
            <p>Priced on version #{replaced.version_id}, the version replaced:</p>
            <ul className="ml-4 list-disc">
              {replaced.in_review > 0 && (
                <li>
                  {costings(replaced.in_review)} in review: the approver can reject it, giving
                  the rates as the reason (“Rates changed since this was submitted: please
                  make a new draft from it and resubmit”). The new draft takes the current rates.
                </li>
              )}
              {replaced.approved > 0 && (
                <li>
                  {costings(replaced.approved)} approved: the price is final and does not
                  change.
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="mt-2 flex gap-2">
          {replaced && affected > 0 && (
            <Button size="sm" variant="outline" onClick={() => onSee(replaced.version_id)}>
              See them
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
