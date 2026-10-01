import { useState } from 'react'
import { AUDIT_LIMITS, useAudit, useAuditActions } from '@/api/admin-console'
import { PageHead, Panel } from '@/components/shell'
import { OptionSelect } from '@/components/ui/option-select'
import { AuditTable } from '@/screens/admin/audit/AuditTable'

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
          <OptionSelect
            value={action || ALL}
            onValueChange={(next) => setAction(next === ALL ? '' : next)}
            options={[
              { value: ALL, label: 'All actions' },
              ...(actions.data ?? []),
            ]}
            size="sm"
            className="w-64 bg-white"
            aria-label="Action"
          />
          <OptionSelect
            value={String(limit)}
            onValueChange={(next) => setLimit(Number(next))}
            options={AUDIT_LIMITS.map((n) => ({
              value: String(n),
              label: `${n} entries`,
            }))}
            size="sm"
            className="w-36 bg-white"
            aria-label="Entries shown"
          />
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
