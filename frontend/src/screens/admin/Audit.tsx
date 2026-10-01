import { useState } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import {
  AUDIT_LIMITS,
  useAudit,
  useAuditActions,
  type AuditEntry,
} from '@/api/admin-console'
import { Grid, PageHead, Panel, Td, Th } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dateTime } from '@/lib/format/dates'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const ALL = 'all'

/**
 * The audit log (#72): who changed what, newest first, read-only.
 *
 * The action filter's options are the actions the log holds, from the server,
 * never a list kept here: a list here would fall behind the first new action
 * and the filter would then hide entries that exist.
 */
export function Audit() {
  const [action, setAction] = useState('')
  const [limit, setLimit] = useState<number>(AUDIT_LIMITS[0])
  const entries = useAudit(action, limit)
  const actions = useAuditActions()

  return (
    <>
      <PageHead
        title="Audit log"
        subtitle="Every change to accounts, approvers, rates and costings, newest first"
      />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            value={action || ALL}
            onValueChange={(next) => setAction(next === ALL ? '' : next)}
          >
            <SelectTrigger
              size="sm"
              className="w-64 bg-white"
              aria-label="Action"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {actions.data?.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(limit)}
            onValueChange={(next) => setLimit(Number(next))}
          >
            <SelectTrigger
              size="sm"
              className="w-36 bg-white"
              aria-label="Entries shown"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_LIMITS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} entries
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {entries.data && (
            <span className="text-[12.5px] text-muted-foreground">
              {entries.data.length} shown
            </span>
          )}
        </div>
        <AuditTable
          entries={entries.data}
          loading={entries.isPending}
          dimmed={entries.isPlaceholderData}
          // Two different sentences: nothing recorded, and nothing of this kind.
          empty={
            action
              ? 'No entry matches that action.'
              : 'Nothing has been recorded yet.'
          }
          expandable
        />
      </Panel>
    </>
  )
}

/** Shared with the overview's recent activity, so an entry reads the same in both. */
export function AuditTable({
  entries,
  loading,
  dimmed,
  empty,
  expandable = false,
}: {
  entries: AuditEntry[] | undefined
  loading: boolean
  dimmed?: boolean
  empty: string
  expandable?: boolean
}) {
  const columns = expandable ? 5 : 4
  return (
    <Grid className={cn(dimmed && 'opacity-70')}>
      <thead>
        <tr>
          {expandable && <Th className="w-8" />}
          <Th className="w-[190px]">When</Th>
          <Th className="w-[240px]">By</Th>
          <Th className="w-[230px]">Action</Th>
          <Th>Object</Th>
        </tr>
      </thead>
      <tbody>
        {loading &&
          [0, 1, 2, 3, 4].map((i) => (
            <tr key={i} role="status" aria-label="Loading entries">
              <Td colSpan={columns}>
                <Skeleton className="h-5" />
              </Td>
            </tr>
          ))}
        {entries?.length === 0 && (
          <tr>
            <Td
              colSpan={columns}
              className="py-6 text-center text-muted-foreground"
            >
              {empty}
            </Td>
          </tr>
        )}
        {entries?.map((entry) => (
          <AuditRow key={entry.id} entry={entry} expandable={expandable} />
        ))}
      </tbody>
    </Grid>
  )
}

function AuditRow({
  entry,
  expandable,
}: {
  entry: AuditEntry
  expandable: boolean
}) {
  const [open, setOpen] = useState(false)
  const detail = entry.detail as Record<string, unknown> | null
  // No expander over an empty detail: it would open onto nothing.
  const hasDetail = !!detail && Object.keys(detail).length > 0

  return (
    <>
      <tr>
        {expandable && (
          <Td>
            {hasDetail && (
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-label={open ? 'Hide detail' : 'Show detail'}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary"
              >
                <ChevronRightIcon
                  className={cn(
                    'size-4 transition-transform',
                    open && 'rotate-90',
                  )}
                />
              </button>
            )}
          </Td>
        )}
        <Td className="tabular whitespace-nowrap text-muted-foreground">
          {dateTime(entry.created_at)}
        </Td>
        <Td>{entry.actor_email ?? 'System'}</Td>
        <Td>
          <Badge variant="secondary" className="font-mono text-[11.5px]">
            {entry.action}
          </Badge>
        </Td>
        <Td className="text-muted-foreground">
          {entry.object_type} #{entry.object_id}
        </Td>
      </tr>
      {open && (
        <tr>
          <Td colSpan={5}>
            <pre className="ml-8 max-h-64 overflow-auto rounded-md border bg-muted/40 px-3 py-2 text-[12px] leading-relaxed">
              {JSON.stringify(detail, null, 2)}
            </pre>
          </Td>
        </tr>
      )}
    </>
  )
}
