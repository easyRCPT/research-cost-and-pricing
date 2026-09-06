import { FootTd } from '@/components/shell'
import { money } from '@/lib/format/utils'
import { costFor } from '@/lib/staff'
import type { StaffLine } from '@/types'

interface StaffTableFooterProps {
  years: number[]
  lines: StaffLine[]
}

export function StaffTableFooter({ years, lines }: StaffTableFooterProps) {
  return (
    <tfoot>
      <tr>
        <FootTd colSpan={6} className="text-left">
          Total
        </FootTd>
        {years.map((year) => [
          <FootTd key={`${year}-time`} />,
          <FootTd key={`${year}-total`}>
            {money(lines.reduce((sum, line) => sum + costFor(line, year), 0))}
          </FootTd>,
        ])}
        <FootTd />
      </tr>
    </tfoot>
  )
}
