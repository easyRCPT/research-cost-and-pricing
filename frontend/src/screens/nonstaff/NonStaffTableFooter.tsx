import { useBudget } from '@/api/budget'
import { FootTd, InAud } from '@/components/shell'
import { useCurrency, useMoney } from '@/lib/format/currency'
import type { NonStaffTotal } from '@/types'

interface NonStaffTableFooterProps {
  columnTotal: NonStaffTotal
}

export function NonStaffTableFooter({ columnTotal }: NonStaffTableFooterProps) {
  const money = useMoney()
  // The workbook's "Total Non-Staff costs in AUD" row (PART C row 47), from
  // the server (#152).
  const foreign = useCurrency() !== 'AUD'
  const { in_aud } = useBudget().data.budget_summary
  const inAud = in_aud.non_staff_cost_by_year
  return (
    <tfoot>
      <tr>
        <FootTd colSpan={3} className="text-left">
          Total
        </FootTd>
        {columnTotal.by_year.map((item) => (
          <FootTd key={item.year}>{money(item.cost)}</FootTd>
        ))}
        <FootTd colSpan={1} />
        <FootTd>{money(columnTotal.total)}</FootTd>
        <FootTd colSpan={1} />
      </tr>
      {foreign && (
        <tr>
          <FootTd
            colSpan={3}
            className="text-left font-normal text-muted-foreground"
          >
            Amount in AUD
          </FootTd>
          {inAud.map((item) => (
            <FootTd key={item.year} className="font-normal">
              <InAud value={item.amount} />
            </FootTd>
          ))}
          <FootTd colSpan={1} />
          <FootTd className="font-normal">
            <InAud value={in_aud.price_summary.non_staff_cost} />
          </FootTd>
          <FootTd colSpan={1} />
        </tr>
      )}
    </tfoot>
  )
}
