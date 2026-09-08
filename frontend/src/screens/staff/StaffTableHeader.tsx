import { Th } from '@/components/shell'

interface StaffTableHeaderProps {
  years: number[]
}

export function StaffTableHeader({ years }: StaffTableHeaderProps) {
  return (
    <thead>
      <tr>
        <Th rowSpan={2} className="w-48">
          Name / Role
        </Th>
        <Th rowSpan={2}>Employment Type</Th>
        <Th rowSpan={2}>Category</Th>
        <Th rowSpan={2}>Classification</Th>
        <Th rowSpan={2}>Basis</Th>
        <Th rowSpan={2} align="right">
          Rate (AUD)
        </Th>
        {years.map((year, i) => (
          <Th key={year} colSpan={2} align="center" className="text-primary">
            Year {i + 1} ({year})
          </Th>
        ))}
        <Th rowSpan={2} className="w-8" />
      </tr>
      <tr>
        {years.map((year) => [
          <Th key={`${year}-time`} align="right" className="w-20">
            Time
          </Th>,
          <Th key={`${year}-total`} align="right" className="w-28">
            Total (AUD)
          </Th>,
        ])}
      </tr>
    </thead>
  )
}
