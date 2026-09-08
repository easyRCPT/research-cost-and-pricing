import {
  useBudget,
  useField,
  useStaffLines,
  type NonStaffLines,
} from '@/api/budget'
import { Derived, Ledger, LedgerRow, Panel } from '@/components/shell'
import { NumberInput } from '@/components/ui/number-input'
import { Slider } from '@/components/ui/slider'
import { money } from '@/lib/format/utils'
import { costRows } from '@/lib/in-kind'
import { InKindFlagsTable } from './inkind/InKindFlagsTable'

const MAX_MARGIN = 100

const asPercent = (fraction: number) => fraction * 100
const asFraction = (percent: number) =>
  Math.min(MAX_MARGIN, Math.max(0, percent)) / 100
const amount = (value: number) => <Derived>{money(value)}</Derived>

export interface AdjustPriceProps {
  nonStaff: NonStaffLines
}

export function AdjustPrice({ nonStaff }: AdjustPriceProps) {
  const { data: budget } = useBudget()
  const margin = useField('margin')

  const summary = budget.budget_summary.price_summary
  const deanRequired = budget.budget_summary.dean_required
  const percent = asPercent(margin.value)
  const setPercent = (next: number) => margin.onChange(asFraction(next))
  const staff = useStaffLines(budget.years)

  const rows = costRows(budget, staff, nonStaff)

  return (
    <>
      <Panel title="Identifying in-kind contributions">
        <InKindFlagsTable rows={rows} />

        <Ledger className="mt-4">
          <tbody>
            <LedgerRow
              label="In-kind staff costs"
              value={amount(summary.in_kind_staff_cost)}
            />
            <LedgerRow
              label="In-kind non-staff costs"
              value={amount(summary.in_kind_non_staff_cost)}
            />
            <LedgerRow
              tone="rule"
              label="Total in-kind (University investment)"
              value={amount(summary.in_kind_project_cost)}
            />
          </tbody>
        </Ledger>
      </Panel>

      <Panel title="Margin" className="mt-4">
        <div className="flex flex-wrap items-center gap-4">
          <Slider
            className="max-w-[320px] min-w-[220px] flex-1"
            min={0}
            max={MAX_MARGIN}
            step={1}
            value={[percent]}
            onValueChange={([next]) => setPercent(next)}
          />
          <NumberInput
            min={0}
            max={MAX_MARGIN}
            className="tabular h-9 w-[90px] text-right"
            value={Number(percent.toFixed(2))}
            onChange={setPercent}
          />
          <span className="text-[13.5px] text-muted-foreground">%</span>
          {deanRequired && (
            <span className="rounded-md bg-warn-bg px-2 py-1 text-[12.5px] text-warn">
              Dean's authorisation required
            </span>
          )}
        </div>

        <Ledger className="mt-4">
          <tbody>
            <LedgerRow
              label="Project cost (excluding in-kind)"
              value={amount(summary.project_cost)}
            />
            <LedgerRow
              label={`Margin at ${asPercent(budget.budget_info.margin).toFixed(1)}%`}
              value={amount(summary.margin_amount)}
            />
            <LedgerRow
              tone="rule"
              label="Price excluding GST"
              value={amount(summary.total_price_exc_gst)}
            />
            <LedgerRow
              label="Price including GST"
              value={amount(summary.total_price_inc_gst)}
            />
          </tbody>
        </Ledger>
      </Panel>
    </>
  )
}
