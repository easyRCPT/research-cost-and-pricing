import type { ReactNode } from 'react'

import { TableCard, type TableCardTable } from '@/components/data-table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface LookupTabView {
  value: string
  title: string
  notice?: ReactNode
  tables: TableCardTable[]
}

interface LookupTabsViewProps {
  tabs: LookupTabView[]
  /** The tab shown, when the caller picks it. */
  value?: string
  onValueChange?: (value: string) => void
  /** The table shown in each tab of several, when the caller picks it. */
  tables?: Record<string, string>
  onTableChange?: (tab: string, table: string) => void
}

export function LookupTabsView({
  tabs,
  value,
  onValueChange,
  tables,
  onTableChange,
}: LookupTabsViewProps) {
  return (
    <Tabs defaultValue={tabs[0].value} value={value} onValueChange={onValueChange}>
      <div className="mb-5 w-fit max-w-full overflow-x-auto rounded-lg border bg-card p-1">
        <TabsList aria-label="Lookup tables" className="bg-transparent">
          {tabs.map((tab) => {
            const count = tab.tables.reduce((sum, t) => sum + (t.count ?? 0), 0)
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-active:bg-transparent data-active:shadow-none! font-semibold"
              >
                {tab.title}
                {count > 0 && (
                  <Badge className="ml-1.5" aria-label={`${count} unsaved`}>
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-4">
          {tab.notice && (
            <Alert>
              <AlertDescription>{tab.notice}</AlertDescription>
            </Alert>
          )}
          <TableCard
            tables={tab.tables}
            value={tables?.[tab.value]}
            onValueChange={(table) => onTableChange?.(tab.value, table)}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
