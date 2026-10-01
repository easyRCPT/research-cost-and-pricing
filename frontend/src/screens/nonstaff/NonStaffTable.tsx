import { Plus } from 'lucide-react'

import { Grid } from '@/components/shell'
import { Button } from '@/components/ui/button'
import type { NonStaffCategory, NonStaffLine } from '@/types'
import type { NonStaffTotal } from '@/types'

import { NonStaffTableBody } from './NonStaffTableBody'
import { NonStaffTableFooter } from './NonStaffTableFooter'
import { NonStaffTableHeader } from './NonStaffTableHeader'

interface NonStaffTableProps {
  lines: NonStaffLine[]
  years: number[]
  categories: NonStaffCategory[]
  columnTotal: NonStaffTotal
  patchLine: (id: string, patch: Partial<NonStaffLine>) => void
  removeLine: (id: string) => void
  addLine: () => void
}

export function NonStaffTable({
  lines,
  years,
  categories,
  columnTotal,
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
        <NonStaffTableFooter columnTotal={columnTotal} />
      </Grid>
      <Button variant="outline" size="sm" className="mt-3" onClick={addLine}>
        <Plus /> Add row
      </Button>
    </>
  )
}
