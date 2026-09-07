import { useBudget } from '@/api/budget-lines'
import {
  Grid,
  Ledger,
  LedgerRow,
  Panel,
  PartBar,
  Td,
  Th,
} from '@/components/shell'
import { Button } from '@/components/ui/button'
import { MONTHS } from '@/lib/constants'
import { money } from '@/lib/format/utils'
import { costGroups } from '@/lib/non-staff'
import type { LookupTables } from '@/types'

const DASH = '—'

const or = (value: string) => (value.trim() ? value : DASH)

export interface BudgetFormProps {
  lookups: LookupTables
}

function KeyValues({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13.5px]">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <span className="text-muted-foreground">{key}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}

export function BudgetForm({ lookups }: BudgetFormProps) {
  const { data: budget } = useBudget()

  const project = budget.project_info
  const info = budget.budget_info
  const summary = budget.budget_summary.price_summary
  const staffBudget = budget.budget_summary.staff_budget
  const nonStaffBudget = budget.budget_summary.non_staff_budget
  const years = budget.years
  const gst = summary.total_price_inc_gst - summary.total_price_exc_gst

  const duration = `${MONTHS[project.start_month - 1]} ${years[0]} to ${
    MONTHS[project.end_month - 1]
  } ${years[years.length - 1]}`

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          Export PDF
        </Button>
      </div>

      <Panel>
        <PartBar>PART A — Project Details</PartBar>
        <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          <KeyValues
            rows={[
              ['Project Title', or(project.title)],
              ['External Party', or(project.funder)],
              ['Lead UoM Chief Investigator', or(project.chief_investigator)],
              ['Department', or(project.department)],
            ]}
          />
          <KeyValues
            rows={[
              ['Project Duration', duration],
              ['Budget Currency', 'AUD - Australian Dollar'],
              ['Project Attributes', DASH],
              [
                'Total Contract Value (Excl. GST)',
                money(summary.total_price_exc_gst),
              ],
            ]}
          />
        </div>

        <PartBar>PART B — Price Summary</PartBar>
        <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          <Ledger>
            <tbody>
              <LedgerRow
                label="Price Excluding GST"
                value={money(summary.total_price_exc_gst)}
              />
              <LedgerRow
                label={
                  <>
                    GST
                    <span className="ml-3 text-muted-foreground">
                      {info.gst_applicable ? 'Yes' : 'No'}
                    </span>
                  </>
                }
                value={money(gst)}
              />
              <LedgerRow
                tone="rule"
                label="Total Price"
                value={money(summary.total_price_inc_gst)}
              />
            </tbody>
          </Ledger>
          <Ledger>
            <tbody>
              <LedgerRow
                label="Full Project Cost (excluding in-kind)"
                value={money(summary.project_cost)}
              />
              <LedgerRow
                label="Cash benefit/cost"
                value={money(summary.cash_benefit)}
              />
              <LedgerRow
                label="Total In-kind (University investment)"
                value={money(summary.total_in_kind_contribution)}
              />
              <LedgerRow
                tone="rule"
                label="University Position"
                value={
                  <span
                    className={
                      summary.university_position < 0 ? 'text-bad' : 'text-good'
                    }
                  >
                    {money(summary.university_position)}
                  </span>
                }
              />
            </tbody>
          </Ledger>
        </div>

        <PartBar>Part E — Staff Budget</PartBar>
        <Ledger>
          <tbody>
            {Object.entries(staffBudget.category_totals).map(
              ([label, value]) => (
                <LedgerRow key={label} label={label} value={money(value)} />
              ),
            )}
            <LedgerRow
              tone="rule"
              label="Total Salaries and On-Costs"
              value={money(staffBudget.cost_before_recovery)}
            />
            <LedgerRow
              label="Cost Recovery (Salaries) (723B)"
              value={money(staffBudget.cost_recovery)}
            />
            <LedgerRow
              label="Cost Recovery (Salaries) Multiplier"
              value={staffBudget.cost_recovery_multiplier.toFixed(2)}
            />
            <LedgerRow
              tone="rule"
              label="Total Staff Costs"
              value={money(staffBudget.total_staff_costs)}
            />
          </tbody>
        </Ledger>

        <PartBar>Part F — Non-Staff Budget</PartBar>
        <Ledger>
          <tbody>
            {costGroups(lookups.non_staff_cost_categories).map((group) => (
              <LedgerRow
                key={group}
                label={group}
                value={money(nonStaffBudget.category_totals[group] ?? 0)}
              />
            ))}
            <LedgerRow
              tone="rule"
              label="Total Non-Staff Costs"
              value={money(nonStaffBudget.total_non_staff_costs)}
            />
          </tbody>
        </Ledger>

        <PartBar description="Must be completed for Grants. Record all technical and financial deliverables and invoicing dates.">
          PART J — Deliverables{' '}
          <span className="font-normal text-muted-foreground">
            optional for contracts
          </span>
        </PartBar>
        <Grid>
          <thead>
            <tr>
              <Th className="w-11" align="center">
                No.
              </Th>
              <Th>Description</Th>
              <Th>Type</Th>
              <Th align="right">Invoice Amount</Th>
              <Th>Due Date</Th>
              <Th>Dependency Sponsor</Th>
            </tr>
          </thead>
          <tbody>
            {info.deliverables.map((deliverable) => (
              <tr key={deliverable.number}>
                <Td align="center" className="text-muted-foreground">
                  {deliverable.number}
                </Td>
                <Td>{or(deliverable.description)}</Td>
                <Td>{or(deliverable.deliverable_type)}</Td>
                <Td align="right" className="tabular">
                  {deliverable.invoice_amount === null
                    ? DASH
                    : money(deliverable.invoice_amount)}
                </Td>
                <Td>{or(deliverable.due_date)}</Td>
                <Td>{or(deliverable.sponsor)}</Td>
              </tr>
            ))}
            {info.deliverables.length === 0 && (
              <tr>
                <Td
                  colSpan={6}
                  className="py-6 text-center text-muted-foreground"
                >
                  No deliverables recorded.
                </Td>
              </tr>
            )}
          </tbody>
        </Grid>
      </Panel>
    </>
  )
}
