import { useBudget } from '@/api/budget'
import { Panel } from '@/components/shell'
import type { LookupTables } from '@/types'
import { ProjectDetailsSection } from './budget-form/ProjectDetailsSection'
import { PriceSummarySection } from './budget-form/PriceSummarySection'
import { StaffBudgetSection } from './budget-form/StaffBudgetSection'
import { NonStaffBudgetSection } from './budget-form/NonStaffBudgetSection'
import { DeliverablesSection } from './budget-form/DeliverablesSection'

export interface BudgetFormProps {
  lookups: LookupTables
}

export function BudgetForm({ lookups }: BudgetFormProps) {
  const { data: budget } = useBudget()

  const info = budget.budget_info
  const summary = budget.budget_summary.price_summary

  return (
    <Panel>
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
      <DeliverablesSection deliverables={info.deliverables} />
    </Panel>
  )
}
