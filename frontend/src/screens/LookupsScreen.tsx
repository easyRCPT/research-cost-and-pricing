import { LOOKUP_TABS } from '@/components/lookups-tabs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LookupTables } from '@/types'

export function LookupsScreen({ lookups }: { lookups: LookupTables }) {
  return (
    <Tabs defaultValue={LOOKUP_TABS[0].value}>
      <TabsList className="mb-5">
        {LOOKUP_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.title}
          </TabsTrigger>
        ))}
      </TabsList>

      {LOOKUP_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.render(lookups)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
