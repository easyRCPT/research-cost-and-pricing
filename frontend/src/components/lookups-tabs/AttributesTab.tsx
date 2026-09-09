import { DataTable, TableCard } from '@/components/data-table'
import type { LookupTables } from '@/types'
import { byCode, codeNameColumns } from './code-name-columns'

const ACTIVITY_COLUMNS = codeNameColumns('Activity')
const REGION_COLUMNS = codeNameColumns('Region')

interface AttributesTabProps {
  activities: LookupTables['activities']
  regions: LookupTables['regions']
}

export function AttributesTab({ activities, regions }: AttributesTabProps) {
  return (
    <TableCard
      tables={[
        {
          value: 'activities',
          title: 'Activities',
          table: (
            <DataTable
              columns={ACTIVITY_COLUMNS}
              rows={activities}
              getRowId={byCode}
            />
          ),
        },
        {
          value: 'regions',
          title: 'Regions',
          table: (
            <DataTable
              columns={REGION_COLUMNS}
              rows={regions}
              getRowId={byCode}
            />
          ),
        },
      ]}
    />
  )
}
