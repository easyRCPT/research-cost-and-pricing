import { Panel } from '@/components/shell'
import type { LookupTables } from '@/types'
import { CodeNameGrid } from './CodeNameGrid'

interface AttributesTabProps {
  activities: LookupTables['activities']
  regions: LookupTables['regions']
}

export function AttributesTab({ activities, regions }: AttributesTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Activities">
        <CodeNameGrid label="Activity" rows={activities} />
      </Panel>
      <Panel title="Regions">
        <CodeNameGrid label="Region" rows={regions} className="max-h-[560px]" />
      </Panel>
    </div>
  )
}
