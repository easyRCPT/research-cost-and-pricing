import { salaryRateYear } from '@/lib/salary-rate-year'
import type { ReactNode } from 'react'
import type { LookupTables } from '@/types'
import { AttributesTab } from './AttributesTab'
import { ConstantsTab } from './ConstantsTab'
import { DeliverablesTab } from './DeliverablesTab'
import { EbaTab } from './EbaTab'
import { ExpensesTab } from './ExpensesTab'
import { OnCostsTab } from './OnCostsTab'
import { OrgUnitsTab } from './OrgUnitsTab'
import { SalaryRatesTab } from './SalaryRatesTab'

interface LookupTab {
  value: string
  title: string
  render: (lookups: LookupTables) => ReactNode
}

export const LOOKUP_TABS = [
  {
    value: 'constants',
    title: 'Constants',
    render: (lookups) => <ConstantsTab data={lookups} />,
  },
  {
    value: 'rates',
    title: 'Salary Rates',
    render: (lookups) => (
      <SalaryRatesTab
        salaryRates={lookups.salary_rates}
        incrementCaps={lookups.increment_caps}
        multipliers={lookups.salary_rate_multipliers}
        salaryRateYear={salaryRateYear(lookups)}
      />
    ),
  },
  {
    value: 'eba',
    title: 'EBA Increases',
    render: (lookups) => <EbaTab increases={lookups.eba_increases} />,
  },
  {
    value: 'oncosts',
    title: 'On-costs',
    render: (lookups) => <OnCostsTab rates={lookups.on_cost_rates} />,
  },
  {
    value: 'orgunits',
    title: 'Org Units',
    render: (lookups) => <OrgUnitsTab departments={lookups.departments} />,
  },
  {
    value: 'expenses',
    title: 'Non-Staff Expenses',
    render: (lookups) => (
      <ExpensesTab categories={lookups.non_staff_cost_categories} />
    ),
  },
  {
    value: 'attributes',
    title: 'Activities & Regions',
    render: (lookups) => (
      <AttributesTab
        activities={lookups.activities}
        regions={lookups.regions}
      />
    ),
  },
  {
    value: 'deliverables',
    title: 'Deliverables & Revenue',
    render: (lookups) => (
      <DeliverablesTab
        deliverableTypes={lookups.deliverable_types}
        revenueCategories={lookups.revenue_categories}
      />
    ),
  },
] satisfies readonly LookupTab[]
