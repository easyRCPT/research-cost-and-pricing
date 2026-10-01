import { TableCard } from '@/components/data-table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { LookupTables } from '@/types'

import type { LookupTab } from './lookup-tabs'

interface LookupTabPanelProps {
  tab: LookupTab
  lookups: LookupTables
}

export function LookupTabPanel({ tab, lookups }: LookupTabPanelProps) {
  const card = (
    <TableCard
      tables={tab.tables.map(({ value, title, render }) => ({
        value,
        title,
        table: render(lookups),
      }))}
    />
  )
  if (!tab.notice) return card

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>{tab.notice(lookups)}</AlertDescription>
      </Alert>
      {card}
    </div>
  )
}
