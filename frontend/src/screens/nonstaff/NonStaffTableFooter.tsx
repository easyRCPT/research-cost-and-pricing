import { FootTd } from '@/components/shell'
import { money } from '@/lib/format/utils'
import { amountFor } from '@/lib/non-staff'
import type { NonStaffLine } from '@/types'

interface NonStaffTableFooterProps {
  years: number[]
  lines: NonStaffLine[]
}

export function NonStaffTableFooter({
  years,
  lines,
}: NonStaffTableFooterProps) {
  const perYear = years.map((year) =>
    lines.reduce((sum, line) => sum + amountFor(line, year), 0),
  )
  const total = perYear.reduce((sum, amount) => sum + amount, 0)

  return (
    <tfoot>
      <tr>
        <FootTd colSpan={3} className="text-left">
          Total
        </FootTd>
        {perYear.map((amount, i) => (
          <FootTd key={years[i]}>{money(amount)}</FootTd>
        ))}
        <FootTd>{money(total)}</FootTd>
        <FootTd colSpan={2} />
      </tr>
    </tfoot>
  )
}
