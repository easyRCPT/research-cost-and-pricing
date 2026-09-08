import { useBudget, useField } from '@/api/budget-lines'
import { Derived, Ledger, LedgerRow, Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { NumberInput } from '@/components/ui/number-input'
import { money } from '@/lib/format/utils'

const amount = (value: number) => <Derived>{money(value)}</Derived>

export function CashCoContributions() {
  const { data: budget } = useBudget()
  const cash = useField('cash_co_contribution')

  const summary = budget.budget_summary.price_summary

  return (
    <>
      <Alert>
        <AlertDescription>
          A cash co-contribution is{' '}
          <b>part of the cost and never part of the price</b>. Money the
          department, faculty or Chancellery puts in does not make the project
          cheaper to run in terms of cost and is not charged to the funder.
          Importantly, it comes straight off the University's position.
        </AlertDescription>
      </Alert>

      <Panel
        title="Total cash co-contribution"
        description="Department, Faculty and Chancellery."
        className="mt-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] text-muted-foreground">$</span>
          <NumberInput
            min={0}
            className="tabular h-9 w-[180px] text-right"
            {...cash}
          />
        </div>
      </Panel>

      <Panel title="Effect on the University position" className="mt-4">
        <Ledger>
          <tbody>
            <LedgerRow
              label="Cash benefit from the price"
              value={amount(summary.cash_benefit)}
            />
            <LedgerRow
              tone="sub"
              label="less in-kind contributions (University investment)"
              value={amount(summary.total_in_kind_contribution)}
            />
            <LedgerRow
              tone="sub"
              label="less cash co-contribution"
              value={amount(summary.total_cash_co_contribution)}
            />
            <LedgerRow
              tone="rule"
              label="University position"
              value={
                <Derived>
                  <span
                    className={
                      summary.university_position < 0 ? 'text-bad' : 'text-good'
                    }
                  >
                    {money(summary.university_position)}
                  </span>
                </Derived>
              }
            />
          </tbody>
        </Ledger>
      </Panel>
    </>
  )
}
