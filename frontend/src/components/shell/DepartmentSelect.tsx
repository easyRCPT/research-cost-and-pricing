import { useMemo } from 'react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Department } from '@/types'

/** Faculties in first-seen order, each with its departments in endpoint order. */
function byFaculty(departments: readonly Department[]) {
  const groups = new Map<string, Department[]>()
  for (const department of departments) {
    const group = groups.get(department.faculty)
    if (group) group.push(department)
    else groups.set(department.faculty, [department])
  }
  return [...groups]
}

/** A department picker, grouped by faculty; the value is the department's code. */
export function DepartmentSelect({
  departments,
  value,
  onValueChange,
}: {
  departments: Department[]
  value: string
  onValueChange: (code: string) => void
}) {
  // Several hundred options: built once, not on every render.
  const options = useMemo(
    () =>
      byFaculty(departments).map(([faculty, rows]) => (
        <SelectGroup key={faculty}>
          <SelectLabel>{faculty}</SelectLabel>
          {rows.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      )),
    [departments],
  )

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full max-w-lg">
        <SelectValue placeholder="Select a department" />
      </SelectTrigger>
      <SelectContent>{options}</SelectContent>
    </Select>
  )
}
