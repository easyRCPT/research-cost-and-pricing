import type { AuditEntry } from '@/api/admin-console'
import { Grid, Td, Th } from '@/components/shell'
import { Skeleton } from '@/components/ui/skeleton'
import { AuditRow } from '@/screens/admin/audit/AuditRow'

/** The overview's last few entries, unpaged; the full log is a DataTable. */
export function AuditTable({
  entries,
  loading,
  empty,
}: {
  entries: AuditEntry[] | undefined
  loading: boolean
  empty: string
}) {
  const columns = 4
  return (
    <Grid>
      <thead>
        <tr>
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
          <AuditRow key={entry.id} entry={entry} />
        ))}
      </tbody>
    </Grid>
  )
}
