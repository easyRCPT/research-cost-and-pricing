import { Derived } from './Derived'

/**
 * A figure in AUD beside one in the costing's own currency (#152), as the
 * workbook shows it ("1,234.56 AUD"). The server works it out; this only
 * writes it, with its code, so it is never read as the costing's currency.
 */
export function InAud({ value }: { value: number }) {
  const amount = Math.abs(Math.round(value)).toLocaleString('en-AU')
  return (
    <Derived>
      <span className="text-muted-foreground">
        {value < 0 ? '−' : ''}AUD {amount}
      </span>
    </Derived>
  )
}
