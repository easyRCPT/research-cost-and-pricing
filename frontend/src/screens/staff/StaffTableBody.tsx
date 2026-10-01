import { Td } from '@/components/shell'
import { allClassifications, allTimeBases, staffCategories } from '@/lib/staff'
import type {
  EditableStaffLine,
  SalaryRate,
  SalaryRateMultiplier,
} from '@/types'
import { StaffRow } from './StaffRow'

interface StaffTableBodyProps {
  lines: EditableStaffLine[]
  years: number[]
  salaryRates: SalaryRate[]
  multipliers: SalaryRateMultiplier[]
  ciId: string | null
  ciIncluded: boolean
  patchLine: (id: string, patch: Partial<EditableStaffLine>) => void
  removeLine: (id: string) => void
}

export function StaffTableBody({
  lines,
  years,
  salaryRates,
  multipliers,
  ciId,
  ciIncluded,
  patchLine,
  removeLine,
}: StaffTableBodyProps) {
  const categories = staffCategories(salaryRates)
  const classifications = allClassifications(salaryRates)
  const bases = allTimeBases(multipliers)

  return (
    <tbody>
      {lines.map((line) => (
        <StaffRow
          key={line.id}
          line={line}
          years={years}
          salaryRates={salaryRates}
          multipliers={multipliers}
          categories={categories}
          classifications={classifications}
          bases={bases}
          isCi={line.id === ciId}
          ciIncluded={ciIncluded}
          patchLine={patchLine}
          removeLine={removeLine}
        />
      ))}

      {lines.length === 0 && (
        <tr>
          <Td
            colSpan={7 + years.length * 2}
            className="py-6 text-center text-muted-foreground"
          >
            No staff costs yet.
          </Td>
        </tr>
      )}
    </tbody>
  )
}
