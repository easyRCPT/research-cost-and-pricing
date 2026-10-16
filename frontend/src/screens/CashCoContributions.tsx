import { useField } from '@/api/budget'
import { Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { NumberInput } from '@/components/ui/number-input'
import { MAX_MONEY, toastOutOfRange } from '@/lib/range'

export function CashCoContributions() {
  const cash = useField('cash_co_contribution')

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
            max={MAX_MONEY}
            onOutOfRange={() =>
              toastOutOfRange('Cash co-contribution', 0, MAX_MONEY)
            }
            className="tabular h-9 w-[180px] text-right"
            {...cash}
          />
        </div>
      </Panel>

    </>
  )
}
