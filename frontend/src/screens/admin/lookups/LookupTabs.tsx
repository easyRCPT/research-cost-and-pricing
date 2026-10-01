import type { RateTable } from '@/api/admin-lookups'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RATE_TABLES } from '@/screens/admin/rateTables'
import {
  REFERENCE_TABLES,
  type ReferenceTable,
} from '@/screens/admin/referenceTables'
import type { Staged } from '@/screens/admin/stagedChanges'

interface LookupTabsProps {
  tableId: RateTable | ReferenceTable
  onChange: (id: RateTable | ReferenceTable) => void
  staged: Staged[]
}

export function LookupTabs({ tableId, onChange, staged }: LookupTabsProps) {
  return (
    <Tabs
      value={tableId}
      onValueChange={(next) => onChange(next as typeof tableId)}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
          Rates
        </span>
        <TabsList aria-label="Rate tables" className="flex-wrap">
          {RATE_TABLES.map((table) => {
            const changes = staged.filter(
              (change) => change.table === table.id,
            ).length
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
        <span className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
          Reference
        </span>
        <TabsList aria-label="Reference tables" className="flex-wrap">
          {REFERENCE_TABLES.map((table) => (
            <TabsTrigger key={table.id} value={table.id}>
              {table.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
