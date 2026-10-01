import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface TableCardTable {
  value: string
  title: string
  table: ReactNode
  /** Unsaved changes in this table, badged on its title. */
  count?: number
}

const SHELL = 'rounded-lg border bg-card text-card-foreground'
const TITLE = 'text-[15.5px] font-semibold text-primary'

function Count({ count }: { count?: number }) {
  if (!count) return null
  return (
    <Badge className="ml-1.5" aria-label={`${count} unsaved`}>
      {count}
    </Badge>
  )
}

interface TableCardProps {
  tables: TableCardTable[]
  /** The table shown, when the caller picks it; otherwise the first. */
  value?: string
  onValueChange?: (value: string) => void
}

/** One table per card. Two or more become tabs in the card header. */
export function TableCard({ tables, value, onValueChange }: TableCardProps) {
  if (tables.length === 1) {
    const [only] = tables
    return (
      <section className={SHELL}>
        <header className="flex min-h-14 items-center px-6 pt-1">
          <h3 className={TITLE}>
            {only.title}
            <Count count={only.count} />
          </h3>
        </header>
        {only.table}
      </section>
    )
  }

  return (
    <Tabs
      defaultValue={tables[0].value}
      value={value}
      onValueChange={onValueChange}
      className={`${SHELL} gap-0`}
    >
      <header className="flex min-h-14 items-center px-6 pt-1 mb-3 overflow-x-auto">
        <TabsList variant="line" className="gap-5">
          {tables.map((table) => (
            <TabsTrigger
              key={table.value}
              value={table.value}
              className={`${TITLE} px-0 text-primary/55 hover:text-primary data-active:text-primary`}
            >
              {table.title}
              <Count count={table.count} />
            </TabsTrigger>
          ))}
        </TabsList>
      </header>
      {tables.map((table) => (
        <TabsContent key={table.value} value={table.value}>
          {table.table}
        </TabsContent>
      ))}
    </Tabs>
  )
}
