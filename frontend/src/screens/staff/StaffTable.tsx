import { Grid } from '@/components/shell'
import { Button } from '@/components/ui/button'
import type {
  SalaryRate,
  SalaryRateMultiplier,
  StaffLine,
  StaffTotal,
} from '@/types'
import { Plus } from 'lucide-react'
import { StaffTableBody } from './StaffTableBody'
import { StaffTableFooter } from './StaffTableFooter'
import { StaffTableHeader } from './StaffTableHeader'

interface StaffTableProps {
  lines: StaffLine[]
  years: number[]
  columnTotal: StaffTotal
  salaryRates: SalaryRate[]
  multipliers: SalaryRateMultiplier[]
  patchLine: (id: number, patch: Partial<StaffLine>) => void
  removeLine: (id: number) => void
  addLine: () => void
}

export function StaffTable({
  lines,
  years,
  columnTotal,
  salaryRates,
  multipliers,
  patchLine,
  removeLine,
  addLine,
}: StaffTableProps) {
  return (
    <>
      <Grid>
        <StaffTableHeader years={years} />
        <StaffTableBody
          lines={lines}
          years={years}
          salaryRates={salaryRates}
          multipliers={multipliers}
          patchLine={patchLine}
          removeLine={removeLine}
        />
        <StaffTableFooter years={years} columnTotal={columnTotal} />
      </Grid>
      <Button variant="outline" size="sm" className="mt-3" onClick={addLine}>
        <Plus /> Add row
      </Button>
    </>
  )
}
