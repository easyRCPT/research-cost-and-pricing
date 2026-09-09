import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface TableCardTable {
  value: string
  title: string
  table: ReactNode
}

const SHELL = 'rounded-lg border bg-card text-card-foreground'
const TITLE = 'text-[15.5px] font-semibold text-primary'

/** One table per card. Two or more become tabs in the card header. */
export function TableCard({ tables }: { tables: TableCardTable[] }) {
  if (tables.length === 1) {
    const [only] = tables
    return (
      <section className={SHELL}>
        <header className="flex min-h-14 items-center px-6 pt-1">
          <h3 className={TITLE}>{only.title}</h3>
        </header>
        {only.table}
      </section>
    )
  }

  return (
    <Tabs defaultValue={tables[0].value} className={`${SHELL} gap-0`}>
      <header className="flex min-h-14 items-center px-6 pt-1">
        <TabsList variant="line" className="gap-5">
          {tables.map((table) => (
            <TabsTrigger
              key={table.value}
              value={table.value}
              className={`${TITLE} px-0 text-primary/55 hover:text-primary data-active:text-primary`}
            >
              {table.title}
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
