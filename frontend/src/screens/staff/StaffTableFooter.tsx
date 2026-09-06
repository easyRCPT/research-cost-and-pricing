import { FootTd } from '@/components/shell'
import { money } from '@/lib/format/utils'
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

  return (
    <tfoot>
      <tr>
        <FootTd colSpan={6} className="text-left">
          Total
        </FootTd>
        {years.map((year) => [
          <FootTd key={`${year}-time`} />,
          <FootTd key={`${year}-total`}>{money(costFor(year))}</FootTd>,
        ])}
        <FootTd />
      </tr>
    </tfoot>
  )
}
