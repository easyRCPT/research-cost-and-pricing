import type { AuditEntry } from '@/api/admin-console'
import { Grid, Td, Th } from '@/components/shell'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AuditRow } from '@/screens/admin/audit/AuditRow'

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
