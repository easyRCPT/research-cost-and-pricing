import { useMemo } from 'react'
import { FieldRow } from '@/components/shell'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Department, ProjectInfo } from '@/types'

interface ProjectDepartmentRowProps {
  project: ProjectInfo
  departments: Department[]
  onChange: (patch: Partial<ProjectInfo>) => void
}

/** Faculties in first-seen order, each with its departments in the endpoint's order. */
function byFaculty(departments: readonly Department[]) {
  const groups = new Map<string, Department[]>()
  for (const d of departments) {
    const group = groups.get(d.faculty)
    if (group) group.push(d)
    else groups.set(d.faculty, [d])
  }
  return [...groups]
}

export function ProjectDepartmentRow({
  project,
  departments,
  onChange,
}: ProjectDepartmentRowProps) {
  // A long option list is built once, not on every render. There are several
  // hundred departments here and they do not change while the page is open, so
  // building them inline would rebuild every element each time this row
  // renders. Worth doing for any select with more than a handful of options.
  const options = useMemo(
    () =>
      byFaculty(departments).map(([faculty, rows]) => (
        <SelectGroup key={faculty}>
          <SelectLabel>{faculty}</SelectLabel>
          {rows.map((d) => (
            <SelectItem key={d.code} value={d.code}>
              {d.name}
            </SelectItem>
          ))}
        </SelectGroup>
      )),
    [departments],
  )

  function setDepartment(code: string) {
    const d = departments.find((d) => d.code === code)
    if (d)
      onChange({ department: d.name, faculty: d.faculty, cost_centre: d.code })
  }

  return (
    <FieldRow
      label="Department"
      htmlFor="department"
      required
      hint={project.faculty === '' ? 'Select Department' : project.faculty}
    >
      <Select value={project.cost_centre} onValueChange={setDepartment}>
        <SelectTrigger className="w-full max-w-lg">
          <SelectValue placeholder="Select a department" />
        </SelectTrigger>
        <SelectContent>{options}</SelectContent>
      </Select>
    </FieldRow>
  )
}
