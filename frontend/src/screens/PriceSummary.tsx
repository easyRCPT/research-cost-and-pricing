import { useState } from 'react'
import {
  useBudget,
  useBudgetInfo,
  useUpdateBudgetField,
} from '@/api/budget-lines'
import { Derived, Ledger, LedgerRow, Panel } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { money } from '@/lib/format/utils'
import type { LookupTables } from '@/types'

const DASH = <span className="text-muted-foreground">—</span>

const ratio = (value: number) => `${(value * 100).toFixed(1)}%`
const amount = (value: number) => <Derived>{money(value)}</Derived>
const percent = (value: number) => <Derived>{ratio(value)} </Derived>

const signed = (value: number) => (
  <Derived>
    <span className={value < 0 ? 'text-bad' : 'text-good'}>{money(value)}</span>
  </Derived>
)

const fullRecoveryBasis = (lookups: LookupTables) =>
  lookups.calculation_constants.find(
    (constant) => constant.name === 'full_cost_recovery_multiplier',
  )?.value

export interface PriceSummaryProps {
  lookups: LookupTables
}

export function PriceSummary({ lookups }: PriceSummaryProps) {
  const { data: budget } = useBudget()
  const { cash_co_contribution } = useBudgetInfo()
  const updateBudgetField = useUpdateBudgetField()
  const [cashDraft, setCashDraft] = useState<string | null>(null)

  const summary = budget.budget_summary.price_summary
  const multiplier = budget.budget_info.cost_multiplier
  const basis = fullRecoveryBasis(lookups)

  const commitCash = () => {
    if (cashDraft === null) return
    const value = Math.max(0, Number(cashDraft) || 0)
    setCashDraft(null)
    if (value !== cash_co_contribution) {
      updateBudgetField.mutate({ field: 'cash_co_contribution', value })
    }
  }

  return (
    <>
      <Panel
        title={
          <>
            Cayuse summary{' '}
            <Badge
              variant="secondary"
              className="ml-1 align-middle font-normal"
            >
              read only
            </Badge>
          </>
        }
        description="Use these details to populate the Cayuse Proposal Form Financial Details section. Every figure here is derived from the costing. Nothing is entered in this panel."
      >
        <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          <Ledger>
            <tbody>
              <LedgerRow
                label="Currency Nominated for the project"
                value={<b>AUD</b>}
              />
              <LedgerRow
                label="Amount expected to be received by UoM"
                value={amount(summary.total_price_exc_gst)}
              />
              <LedgerRow
                label="Total Project Cost to UoM (including in-kind)"
                value={amount(summary.total_project_cost)}
              />
              <LedgerRow
                label="Cash co-contributions (university investment)"
                value={amount(summary.total_cash_co_contribution)}
              />
            </tbody>
          </Ledger>
          <Ledger>
            <tbody>
              <LedgerRow
                label="Total amount requested for project"
                value={amount(summary.total_price_inc_gst)}
              />
              <LedgerRow
                label="Cost recovery multiplier used"
                value={multiplier.toFixed(2)}
              />
              <LedgerRow
                label="Justification for cost recovery multiplier"
                value={DASH}
              />
            </tbody>
          </Ledger>
        </div>
      </Panel>

      <Panel title="Price Summary" className="mt-4">
        <div className="overflow-x-auto">
          <Ledger>
            <thead>
              <tr className="border-b text-[12px] text-muted-foreground">
                <th className="py-1.5 text-left font-semibold" />
                <th className="w-[190px] py-1.5 text-right font-semibold">
                  Full Project Cost (AUD)
                </th>
                <th className="w-[190px] py-1.5 text-right font-semibold">
                  Price to be charged to Funder (AUD)
                </th>
              </tr>
            </thead>
            <tbody>
              <LedgerRow
                label="Indirect Cost Recovery multiplier (applied to salaries)"
                secondValue={basis === undefined ? DASH : basis.toFixed(2)}
                value={multiplier.toFixed(2)}
              />
              <LedgerRow
                label="Staff Costs (excluding in-kind)"
                secondValue={DASH}
                value={amount(summary.staff_cost)}
              />
              <LedgerRow
                label="Non-Staff Costs (excluding in-kind)"
                secondValue={amount(summary.non_staff_cost)}
                value={amount(summary.non_staff_cost)}
              />
              <LedgerRow
                tone="rule"
                label="Project Cost (excluding in-kind)"
                secondValue={DASH}
                value={amount(summary.project_cost)}
              />
              <LedgerRow
                label="In-kind (University investment) Staff Costs"
                secondValue={DASH}
                value={amount(summary.in_kind_staff_cost)}
              />
              <LedgerRow
                label="In-kind (University investment) Non-Staff Costs"
                secondValue={amount(summary.in_kind_non_staff_cost)}
                value={amount(summary.in_kind_non_staff_cost)}
              />
              <LedgerRow
                tone="rule"
                label="Total In-kind (University investment) Project Costs"
                secondValue={DASH}
                value={amount(summary.in_kind_project_cost)}
              />
              <LedgerRow
                label="Staff Costs % (excluding in-kind)"
                secondValue={DASH}
                value={percent(summary.staff_cost_percentage)}
              />
              <LedgerRow
                label="Non-Staff Costs % (excluding in-kind)"
                secondValue={DASH}
                value={percent(summary.non_staff_cost_percentage)}
              />
              <LedgerRow
                tone="rule"
                label="Total Project Cost (including in-kind)"
                secondValue={DASH}
                value={amount(summary.total_project_cost)}
              />
              <LedgerRow
                label="Total Price to be charged to Funder (Excluding GST)"
                secondValue=""
                value={amount(summary.total_price_exc_gst)}
              />
              <LedgerRow
                label="Total Price to be charged to Funder (Including GST)"
                secondValue=""
                value={amount(summary.total_price_inc_gst)}
              />
            </tbody>
          </Ledger>
        </div>
      </Panel>

      <Panel
        title="University position"
        description="The surplus or deficit resulting from the project as priced: price to be charged to funder less full project cost, including in-kind and cash contributions."
        className="mt-4"
      >
        <Ledger>
          <tbody>
            <LedgerRow
              label="Cash benefit/cost"
              value={signed(summary.cash_benefit)}
            />
            <LedgerRow
              label="Total In-kind contribution (University investment)"
              value={amount(summary.total_in_kind_contribution)}
            />
            <LedgerRow
              label="Total Cash Co-Contribution (Department, Faculty and Chancellery)"
              value={
                <Input
                  type="number"
                  min={0}
                  className="tabular ml-auto h-8 w-[130px] text-right"
                  value={cashDraft ?? cash_co_contribution}
                  onChange={(event) => setCashDraft(event.target.value)}
                  onBlur={commitCash}
                />
              }
            />
            <LedgerRow
              tone="rule"
              label="University Position"
              value={signed(summary.university_position)}
            />
          </tbody>
        </Ledger>
      </Panel>
    </>
  )
}
