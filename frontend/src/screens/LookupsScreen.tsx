import { LOOKUP_TABS, LookupTabsView } from '@/components/lookups-tabs'
import type { LookupTables } from '@/types'

export function LookupsScreen({ lookups }: { lookups: LookupTables }) {
  return (
    <LookupTabsView
      tabs={LOOKUP_TABS.map((tab) => ({
        value: tab.value,
        title: tab.title,
        notice: 'notice' in tab ? tab.notice(lookups) : undefined,
        tables: tab.tables.map(({ value, title, render }) => ({
          value,
          title,
          table: render(lookups),
        })),
      }))}
    />
  )
}
