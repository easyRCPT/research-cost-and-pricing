import { useBudget, useEditable, useField } from '@/api/budget'
import { Ledger, LedgerRow, Money, Panel } from '@/components/shell'
import { NumberInput } from '@/components/ui/number-input'
import { Slider } from '@/components/ui/slider'
import { percent1 } from '@/lib/format/utils'
import { toastOutOfRange } from '@/lib/range'

// TODO(#87): the 0 floor and 100% ceiling hold until Frank sets the margin policy.
const MAX_MARGIN = 100

const asPercent = (fraction: number) => fraction * 100
const asFraction = (percent: number) =>
  Math.min(MAX_MARGIN, Math.max(0, percent)) / 100
export function MarginPanel() {
  const { data: budget } = useBudget()
  const margin = useField('margin')

  const summary = budget.budget_summary.price_summary
  const deanRequired = budget.budget_summary.dean_required
  const percent = asPercent(margin.value)
  const editable = useEditable()
  const setPercent = (next: number) => margin.onChange(asFraction(next))

  return (
    <Panel title="Margin" className="mt-4">
      <div className="flex flex-wrap items-center gap-4">
        {editable ? (
          <>
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
              onOutOfRange={() => toastOutOfRange('Margin', 0, MAX_MARGIN)}
              className="tabular h-9 w-[90px] text-right"
              value={Number(percent.toFixed(2))}
              onChange={setPercent}
            />
            <span className="text-[13.5px] text-muted-foreground">%</span>
          </>
        ) : (
          // A value, not a disabled slider (#98): a greyed control still
          // invites a reviewer to try to move it, and it isn't theirs to move.
          <span className="tabular text-[22px] font-semibold">
            {percent1(margin.value)}
          </span>
        )}
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
            value={<Money value={summary.project_cost} />}
          />
          <LedgerRow
            label={`Margin at ${percent1(budget.budget_info.margin)}`}
            value={<Money value={summary.margin_amount} />}
          />
          <LedgerRow
            tone="rule"
            label="Price excluding GST"
            value={<Money value={summary.total_price_exc_gst} />}
          />
          <LedgerRow
            label="Price including GST"
            value={<Money value={summary.total_price_inc_gst} />}
          />
        </tbody>
      </Ledger>
    </Panel>
  )
}
