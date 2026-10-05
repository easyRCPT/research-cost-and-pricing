import { useBudget } from '@/api/budget'
import { useCostingLookups } from '@/api/lookups'
import { LOOKUP_TABS, LookupTabsView } from '@/components/lookups-tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { shortDate } from '@/lib/format/dates'

/**
 * The tables this costing is priced on (#198). A submitted or approved one
 * keeps the version stamped when it was submitted, which an administrator's
 * later rate change does not move, so its tables can differ from today's.
 */
export function LookupsScreen() {
  const { data: lookups } = useCostingLookups()
  const { approval } = useBudget().data

  return (
    <>
      <Alert className="mb-4">
        <AlertDescription>
          {approval.lookup_version ? (
            <>
              These are the rates this costing was priced on:{' '}
              <b>version #{approval.lookup_version}</b>, locked when it was
              submitted
              {approval.submitted_at &&
                ` on ${shortDate(approval.submitted_at)}`}
              . The current rates may differ.
            </>
          ) : (
            <>
              These are the current rates, which this draft is priced on. A
              costing keeps the rates it is submitted on.
            </>
          )}
        </AlertDescription>
      </Alert>
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
    </>
  )
}
