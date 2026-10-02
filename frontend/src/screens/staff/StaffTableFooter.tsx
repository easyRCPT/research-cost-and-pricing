import { useBudget } from '@/api/budget'
import { FootTd, InAud, Money } from '@/components/shell'
import { useCurrency } from '@/lib/format/currency'
import type { StaffTotal } from '@/types'

interface StaffTableFooterProps {
  years: number[]
  columnTotal: StaffTotal
}

export function StaffTableFooter({
  years,
  columnTotal,
}: StaffTableFooterProps) {
  const costFor = (year: number) =>
    columnTotal.by_year.find((entry) => entry.year === year)?.cost ?? 0
  // The workbook's "Amount in AUD" row (PART B row 42), from the server (#152).
  const foreign = useCurrency() !== 'AUD'
  const { in_aud } = useBudget().data.budget_summary
  const inAud = in_aud.staff_cost_by_year
  const audFor = (year: number) =>
    inAud.find((entry) => entry.year === year)?.amount ?? 0

  return (
    <tfoot>
      <tr>
        <FootTd colSpan={6} className="text-left">
          Total
        </FootTd>
        {years.map((year) => [
          <FootTd key={`${year}-time`} />,
          <FootTd key={`${year}-total`}>
            <Money value={costFor(year)} />
          </FootTd>,
        ])}
        <FootTd>
          <Money value={columnTotal.total} />
        </FootTd>
        <FootTd />
      </tr>
      {foreign && (
        <tr>
          <FootTd
            colSpan={6}
            className="text-left font-normal text-muted-foreground"
          >
            Amount in AUD
          </FootTd>
          {years.map((year) => [
            <FootTd key={`${year}-time`} />,
            <FootTd key={`${year}-total`} className="font-normal">
              <InAud value={audFor(year)} />
            </FootTd>,
          ])}
          <FootTd className="font-normal">
            <InAud value={in_aud.price_summary.staff_cost} />
          </FootTd>
          <FootTd />
        </tr>
      )}
    </tfoot>
  )
}
