import { Input } from '@/components/ui/input'
import { useDebounced } from '@/lib/use-debounced'
import type { RateTableSpec } from '@/screens/admin/rateTables'

import { filterPlaceholder } from './filterRows'

const FILTER_DELAY_MS = 250

/** The box that narrows a long rate table; it reports what was typed once typing pauses. */
export function RateFilter({
  spec,
  onFilter,
}: {
  spec: RateTableSpec
  onFilter: (query: string) => void
}) {
  const report = useDebounced(onFilter, FILTER_DELAY_MS)

  return (
    <Input
      type="search"
      aria-label={`Filter ${spec.label.toLowerCase()}`}
      placeholder={filterPlaceholder(spec)}
      className="mb-3 max-w-xs"
      onChange={(event) => report(event.target.value)}
    />
  )
}
