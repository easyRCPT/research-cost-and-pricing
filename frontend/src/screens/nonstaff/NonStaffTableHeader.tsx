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
          <Th key={year} align="right" className="text-primary">
            Year {i + 1} ({year})
          </Th>
        ))}
        <Th align="right">Total (AUD)</Th>
        <Th align="center">
          Additional 10%
          <span className="block font-normal text-muted-foreground">
            added to direct cost*
          </span>
        </Th>
        <Th className="w-8" />
      </tr>
    </thead>
  )
}
