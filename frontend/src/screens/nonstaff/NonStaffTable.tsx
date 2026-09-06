import { Grid } from '@/components/shell'
import type { NonStaffCategory, NonStaffLine } from '@/types'
import { NonStaffTableHeader } from './NonStaffTableHeader'
import { NonStaffTableBody } from './NonStaffTableBody'
import { NonStaffTableFooter } from './NonStaffTableFooter'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface NonStaffTableProps {
  lines: NonStaffLine[]
  years: number[]
  categories: NonStaffCategory[]
  patchLine: (id: number, patch: Partial<NonStaffLine>) => void
  removeLine: (id: number) => void
  addLine: () => void
}

export function NonStaffTable({
  lines,
  years,
  categories,
  patchLine,
  removeLine,
  addLine,
}: NonStaffTableProps) {
  return (
    <>
      <Grid>
        <NonStaffTableHeader years={years} />
        <NonStaffTableBody
          lines={lines}
          years={years}
          patchLine={patchLine}
          categories={categories}
          removeLine={removeLine}
        />
        <NonStaffTableFooter lines={lines} years={years} />
      </Grid>
      <Button variant="outline" size="sm" className="mt-3" onClick={addLine}>
        <Plus /> Add row
      </Button>
    </>
  )
}
