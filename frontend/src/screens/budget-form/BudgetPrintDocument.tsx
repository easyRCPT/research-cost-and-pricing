import { MONTHS } from '@/lib/constants'
import { money } from '@/lib/format/utils'
import type { BudgetDetail, LookupTables } from '@/types'
import { DASH, or } from './format'
import { ProjectDetailsSection } from './ProjectDetailsSection'
import { PriceSummarySection } from './PriceSummarySection'
import { StaffBudgetSection } from './StaffBudgetSection'
import { NonStaffBudgetSection } from './NonStaffBudgetSection'
import { InKindSection } from './InKindSection'
import { CoverDetail } from './CoverDetail'
import { DeliverablesPrintSection } from './DeliverablesPrintSection'

export interface BudgetPrintDocumentProps {
  budget: BudgetDetail
  lookups: LookupTables
  /** Defaults to render time; pass a value for stable output. */
  generatedAt?: Date
}

/** A read-only Budget Form document. It renders entirely from its input data,
 *  so it can be mounted by the editor today or by a download view later. */
export function BudgetPrintDocument({
  budget,
  lookups,
  generatedAt = new Date(),
}: BudgetPrintDocumentProps) {
  const { budget_info: info, budget_summary: summary } = budget
  const project = budget.project_info
  const duration =
    budget.years.length > 0
      ? `${MONTHS[project.start_month - 1]} ${budget.years[0]} to ${
          MONTHS[project.end_month - 1]
        } ${budget.years[budget.years.length - 1]}`
      : DASH

  return (
    <article className="budget-print-document">
      <header className="budget-print-cover mb-8 border-b-2 border-foreground pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest">
          Research Budget
        </p>
        <h1 className="mb-5 text-2xl font-bold leading-tight">
          {or(project.title)}
        </h1>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <CoverDetail label="Chief Investigator">
            {or(project.chief_investigator)}
          </CoverDetail>
          <CoverDetail label="Department">{or(project.department)}</CoverDetail>
          <CoverDetail label="Project Duration">{duration}</CoverDetail>
          <CoverDetail label="Total Price (incl. GST)">
            {money(summary.price_summary.total_price_inc_gst)}
          </CoverDetail>
          <CoverDetail label="Generated">
            {new Intl.DateTimeFormat('en-AU', { dateStyle: 'long' }).format(
              generatedAt,
            )}
          </CoverDetail>
        </dl>
      </header>
      <section className="budget-print-section">
        <ProjectDetailsSection
          project={budget.project_info}
          years={budget.years}
          summary={summary.price_summary}
        />
      </section>
      <section className="budget-print-section">
        <PriceSummarySection
          summary={summary.price_summary}
          gstApplicable={info.gst_applicable}
        />
      </section>
      <section className="budget-print-section">
        <StaffBudgetSection staffBudget={summary.staff_budget} />
      </section>
      <section className="budget-print-section">
        <NonStaffBudgetSection
          nonStaffBudget={summary.non_staff_budget}
          lookups={lookups}
        />
      </section>
      <section className="budget-print-section">
        <InKindSection budget={budget} />
      </section>
      <section className="budget-print-section budget-print-deliverables">
        <DeliverablesPrintSection budget={budget} />
      </section>
    </article>
  )
}
