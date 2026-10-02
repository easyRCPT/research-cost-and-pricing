import { FootTd } from '@/components/shell'
import { money } from '@/lib/format/utils'
import type { NonStaffTotal } from '@/types'

interface NonStaffTableFooterProps {
  columnTotal: NonStaffTotal
}

export function NonStaffTableFooter({
  columnTotal,
}: NonStaffTableFooterProps) {
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
    </tfoot>
  )
}
