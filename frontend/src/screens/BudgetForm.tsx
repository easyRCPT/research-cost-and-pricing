import { useBudget } from '@/api/budget'
import { useLookups } from '@/api/lookups'
import { Panel } from '@/components/shell'

import { BudgetPrintDocument } from './budget-form/BudgetPrintDocument'
import { DeliverablesSection } from './budget-form/DeliverablesSection'
import { InKindSection } from './budget-form/InKindSection'
import { NonStaffBudgetSection } from './budget-form/NonStaffBudgetSection'
import { PriceSummarySection } from './budget-form/PriceSummarySection'
import { ProjectDetailsSection } from './budget-form/ProjectDetailsSection'
import { StaffBudgetSection } from './budget-form/StaffBudgetSection'

export function BudgetForm() {
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()

  const info = budget.budget_info
  const summary = budget.budget_summary.price_summary

  return (
    <>
      <Panel className="print:hidden">
        <ProjectDetailsSection
          project={budget.project_info}
          years={budget.years}
          summary={summary}
        />
        <PriceSummarySection
          summary={summary}
          gstApplicable={info.gst_applicable}
        />
        <StaffBudgetSection staffBudget={budget.budget_summary.staff_budget} />
        <NonStaffBudgetSection
          nonStaffBudget={budget.budget_summary.non_staff_budget}
          lookups={lookups}
        />
        <InKindSection budget={budget} />
        <DeliverablesSection />
      </Panel>
      <div className="hidden print:block">
        <BudgetPrintDocument budget={budget} lookups={lookups} />
      </div>
    </>
  )
}
