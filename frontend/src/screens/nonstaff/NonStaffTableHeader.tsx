import { Th } from '@/components/shell'

export interface NonStaffTableHeaderProps {
  years: number[]
}

export function NonStaffTableHeader({ years }: NonStaffTableHeaderProps) {
  return (
    <thead>
      <tr>
        <Th>Cost group</Th>
        <Th>Expense type</Th>
        <Th>Description</Th>
        {years.map((year, i) => (
          <Th key={year} align="right" className="w-28 text-primary">
            Year {i + 1} ({year})
          </Th>
        ))}
        <Th align="right" className="w-28">
          Total (AUD)
        </Th>
        <Th align="center">Additional 10%</Th>
        <Th className="w-8" />
      </tr>
    </thead>
  )
}
