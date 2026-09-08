import { useState } from 'react'
import {
  useBudget,
  useUpdateBudgetField,
  useUpdateStaffField,
  type NonStaffLines,
} from '@/api/budget-lines'
import { Ledger, LedgerRow, Panel } from '@/components/shell'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { money } from '@/lib/format/utils'
import { costRows } from '@/lib/in-kind'
import { InKindFlagsTable } from './inkind/InKindFlagsTable'

const MAX_MARGIN = 100

const asPercent = (fraction: number) => fraction * 100

export interface AdjustPriceProps {
  nonStaff: NonStaffLines
}

export function AdjustPrice({ nonStaff }: AdjustPriceProps) {
  const { data: budget } = useBudget()
  const updateBudgetField = useUpdateBudgetField()
  const updateStaffField = useUpdateStaffField()
  const [draft, setDraft] = useState<number | null>(null)

  const summary = budget.budget_summary.price_summary
  const deanRequired = budget.budget_summary.dean_required
  const percent = draft ?? asPercent(summary.margin)

  const rows = costRows(budget, nonStaff, (line, value) =>
    updateStaffField.mutate({ row_id: line.id, field: 'in_kind', value }),
  )

  const commit = (next: number) => {
    setDraft(null)
    const value = Math.min(MAX_MARGIN, Math.max(0, next)) / 100
    if (value !== summary.margin) {
      updateBudgetField.mutate({ field: 'margin', value })
    }
  }

  return (
    <>
      <Panel title="Identifying in-kind contributions">
        <InKindFlagsTable rows={rows} />

        <Ledger className="mt-4">
          <tbody>
            <LedgerRow
              label="In-kind staff costs"
              value={money(summary.in_kind_staff_cost)}
            />
            <LedgerRow
              label="In-kind non-staff costs"
              value={money(summary.in_kind_non_staff_cost)}
            />
            <LedgerRow
              tone="rule"
              label="Total in-kind (University investment)"
              value={money(summary.in_kind_project_cost)}
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
            onValueChange={([next]) => setDraft(next)}
            onValueCommit={([next]) => commit(next)}
          />
          <Input
            type="number"
            min={0}
            max={MAX_MARGIN}
            className="tabular h-9 w-[90px] text-right"
            value={Number(percent.toFixed(2))}
            onChange={(event) => setDraft(Number(event.target.value))}
            onBlur={() => commit(percent)}
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
              value={money(summary.project_cost)}
            />
            <LedgerRow
              label={`Margin at ${asPercent(summary.margin).toFixed(1)}%`}
              value={money(summary.margin_amount)}
            />
            <LedgerRow
              tone="rule"
              label="Price excluding GST"
              value={money(summary.total_price_exc_gst)}
            />
            <LedgerRow
              label="Price including GST"
              value={money(summary.total_price_inc_gst)}
            />
          </tbody>
        </Ledger>
      </Panel>
    </>
  )
}
