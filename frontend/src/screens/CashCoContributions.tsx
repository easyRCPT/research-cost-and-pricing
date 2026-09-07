import { useState } from 'react'
import { useBudget, useUpdateBudgetField } from '@/api/budget-lines'
import { Ledger, LedgerRow, Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { money } from '@/lib/format/utils'

export function CashCoContributions() {
  const { data: budget } = useBudget()
  const updateBudgetField = useUpdateBudgetField()
  const [draft, setDraft] = useState<string | null>(null)

  const summary = budget.budget_summary.price_summary

  const commit = () => {
    if (draft === null) return
    const value = Math.max(0, Number(draft) || 0)
    setDraft(null)
    if (value !== summary.total_cash_co_contribution) {
      updateBudgetField.mutate({ field: 'cash_co_contribution', value })
    }
  }

  return (
    <>
      <Alert>
        <AlertDescription>
          A cash co-contribution is{' '}
          <b>part of the cost and never part of the price</b>. Money the
          department, faculty or Chancellery puts in does not make the project
          cheaper to run in terms of cost and is not charged to the funder. Importantly, it comes straight
          off the University's position.
        </AlertDescription>
      </Alert>

      <Panel
        title="Total cash co-contribution"
        description="Department, Faculty and Chancellery."
        className="mt-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] text-muted-foreground">$</span>
          <Input
            type="number"
            min={0}
            className="tabular h-9 w-[180px] text-right"
            value={draft ?? summary.total_cash_co_contribution}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
          />
        </div>
      </Panel>

      <Panel title="Effect on the University position" className="mt-4">
        <Ledger>
          <tbody>
            <LedgerRow
              label="Cash benefit from the price"
              value={money(summary.cash_benefit)}
            />
            <LedgerRow
              tone="sub"
              label="less in-kind contributions (University investment)"
              value={money(summary.total_in_kind_contribution)}
            />
            <LedgerRow
              tone="sub"
              label="less cash co-contribution"
              value={money(summary.total_cash_co_contribution)}
            />
            <LedgerRow
              tone="rule"
              label="University position"
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
      </Panel>
    </>
  )
}
