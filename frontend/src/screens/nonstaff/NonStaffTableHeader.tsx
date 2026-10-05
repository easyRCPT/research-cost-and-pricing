import { Th } from '@/components/shell'
import { useCurrency } from '@/lib/format/currency'

interface NonStaffTableHeaderProps {
  years: number[]
}

export function NonStaffTableHeader({ years }: NonStaffTableHeaderProps) {
  const currency = useCurrency()
  return (
    <thead>
      <tr>
        <Th className="w-72">Cost group</Th>
        <Th>Expense type</Th>
        <Th>Description</Th>
        {years.map((year, i) => (
          <Th key={year} align="right" className="w-28 text-primary">
            Year {i + 1} ({year})
          </Th>
        ))}
        <Th align="center" className="w-24">
          Additional 10%
        </Th>
        <Th align="right" className="w-28">
          Total ({currency})
        </Th>
        <Th className="w-8" />
      </tr>
    </thead>
  )
}
