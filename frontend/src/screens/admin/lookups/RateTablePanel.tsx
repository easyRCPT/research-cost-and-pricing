import type { RateTable } from '@/api/admin-lookups'
import { Panel } from '@/components/shell'
import { salaryRateYear } from '@/lib/salary-rate-year'
import { AddRateRow } from '@/screens/admin/rates/AddRateRow'
import { RateTable as RateTableView } from '@/screens/admin/rates/RateTable'
import type { Refused } from '@/screens/admin/rates/types'
import { tableSpec } from '@/screens/admin/rateTables'
import { type Row, type Staged, upsert } from '@/screens/admin/stagedChanges'
import type { LookupTables } from '@/types'

interface RateTablePanelProps {
  tableId: RateTable
  lookups: LookupTables
  rows: Row[]
  staged: Staged[]
  refused: Refused
  onStage: (next: Staged[]) => void
}

export function RateTablePanel({
  tableId,
  lookups,
  rows,
  staged,
  refused,
  onStage,
}: RateTablePanelProps) {
  return (
    <Panel
      title={tableSpec(tableId).label}
      description={
        tableId === 'salary_rates' && salaryRateYear(lookups) !== undefined
          ? `These are ${salaryRateYear(lookups)} rates: each later year adds that year's EBA increase. The year is the salary rate year, on the Constants tab.`
          : undefined
      }
    >
      <RateTableView
        spec={tableSpec(tableId)}
        rows={rows}
        staged={staged}
        refused={refused}
        onStage={onStage}
      />
      {tableSpec(tableId).addable !== false && (
        <AddRateRow
          key={tableId}
          spec={tableSpec(tableId)}
          onAdd={(key, value) =>
            onStage(
              upsert(staged, { op: 'create', table: tableId, key, value }),
            )
          }
        />
      )}
    </Panel>
  )
}
