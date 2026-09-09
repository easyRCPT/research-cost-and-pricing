import { LOOKUP_TABS } from '@/components/lookups-tabs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LookupTables } from '@/types'

export function LookupsScreen({ lookups }: { lookups: LookupTables }) {
  return (
    <Tabs defaultValue={LOOKUP_TABS[0].value}>
      <div className="mb-5 w-fit rounded-lg border bg-card p-1">
        <TabsList className="bg-transparent">
          {LOOKUP_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-active:bg-transparent data-active:shadow-none! font-semibold"
            >
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {LOOKUP_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.render(lookups)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
