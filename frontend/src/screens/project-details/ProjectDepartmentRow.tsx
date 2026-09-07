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

export function ProjectDepartmentRow({
  project,
  departments,
  onChange,
}: ProjectDepartmentRowProps) {
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
      hint={`Faculty — ${project.faculty}`}
    >
      <Select
        value={project.cost_centre}
        onValueChange={setDepartment}
      >
        <SelectTrigger className="w-full max-w-lg">
          <SelectValue placeholder="Select a department" />
        </SelectTrigger>
        <SelectContent>
          {byFaculty(departments).map(([faculty, rows]) => (
            <SelectGroup key={faculty}>
              <SelectLabel>{faculty}</SelectLabel>
              {rows.map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </FieldRow>
  )
}
