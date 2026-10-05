import { useField } from '@/api/budget'
import { FieldRow } from '@/components/shell'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberInput } from '@/components/ui/number-input'
import { OptionSelect } from '@/components/ui/option-select'
import type { BudgetInfo, Currency } from '@/types'

interface ProjectCurrencyRowProps {
  info: BudgetInfo
  currencies: Currency[]
}

/**
 * The currency the costing is priced in, and its rate (#152), as the
 * workbook's PART A sets them: the rate from the rates table, or the
 * researcher's own if they tick to override it. Every conversion is the
 * server's: this only says which currency and rate.
 */
export function ProjectCurrencyRow({
  info,
  currencies,
}: ProjectCurrencyRowProps) {
  const currency = useField('currency', 0)
  const ownRate = useField('exchange_rate_override', 600)
  const foreign = info.currency !== 'AUD'
  const code = info.currency

  return (
    <FieldRow
      label="Budget currency"
      htmlFor="currency"
      hint={
        foreign
          ? `Non-staff costs, the cash co-contribution and deliverable invoices are entered in ${code}. Changing the currency or its rate converts them, so their value in AUD holds.`
          : undefined
      }
    >
      <div className="flex max-w-180 flex-wrap items-center gap-x-5 gap-y-2">
        <OptionSelect
          id="currency"
          value={currency.value}
          onValueChange={currency.onChange}
          options={currencies.map((c) => ({
            value: c.code,
            label: `${c.code} - ${c.name}`,
          }))}
          className="w-72 bg-white"
          aria-label="Budget currency"
        />
        {foreign && (
          <span className="tabular text-[13px]">
            1 AUD = {info.table_exchange_rate} {code}
            <span className="ml-1 text-muted-foreground">(rates table)</span>
          </span>
        )}
      </div>
      {foreign && (
        <div className="mt-2 flex max-w-180 flex-wrap items-center gap-3 text-[13px]">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={ownRate.value !== null}
              onCheckedChange={(checked) =>
                ownRate.onChange(
                  checked === true ? info.table_exchange_rate : null,
                )
              }
            />
            Use a rate of my own
          </label>
          {ownRate.value !== null && (
            <span className="flex items-center gap-2">
              1 AUD =
              <NumberInput
                className="tabular h-8 w-32 text-right"
                step={0.0001}
                min={0}
                value={ownRate.value}
                onChange={ownRate.onChange}
                aria-label={`My rate, ${code} per AUD`}
              />
              {code}
            </span>
          )}
        </div>
      )}
    </FieldRow>
  )
}
