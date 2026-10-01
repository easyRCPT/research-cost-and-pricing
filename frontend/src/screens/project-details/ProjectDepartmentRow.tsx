import { FieldRow } from '@/components/shell'
import { DepartmentSelect } from '@/components/shell/DepartmentSelect'
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
      <DepartmentSelect
        departments={departments}
        value={project.cost_centre}
        onValueChange={setDepartment}
      />
    </FieldRow>
  )
}
