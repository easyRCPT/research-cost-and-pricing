import type { LookupTables, ProjectInfo } from '@/types'
import { FieldRow, Panel } from '@/components/shell'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ProjectAttributesRow } from './project-details/ProjectAttributesRow'
import { ProjectDurationRow } from './project-details/ProjectDurationRow'
import { ProjectDepartmentRow } from './project-details/ProjectDepartmentRow'

interface ProjectDetailsProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
  lookups: LookupTables
}

export function ProjectDetails({
  project,
  onChange,
  lookups,
}: ProjectDetailsProps) {
  const { departments, activities, regions } = lookups

  return (
    <Panel>
      <FieldRow label="Project title" htmlFor="title" required>
        <Input
          id="title"
          className="max-w-lg"
          value={project.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </FieldRow>

      <FieldRow label="Lead UoM chief investigator" required htmlFor="ci">
        <Input
          id="ci"
          className="max-w-lg"
          value={project.chief_investigator}
          onChange={(e) => onChange({ chief_investigator: e.target.value })}
        />
      </FieldRow>

      <FieldRow label="External party" htmlFor="funder" required>
        <Input
          id="funder"
          className="max-w-lg"
          value={project.funder}
          onChange={(e) => onChange({ funder: e.target.value })}
        />
      </FieldRow>

      <ProjectDepartmentRow
        project={project}
        departments={departments}
        onChange={onChange}
      />

      <FieldRow label="Scheme" htmlFor="scheme" hint="Grants only">
        <Input
          id="scheme"
          className="max-w-sm"
          placeholder="e.g. Discovery Projects 2027"
          value={project.scheme}
          onChange={(e) => onChange({ scheme: e.target.value })}
        />
      </FieldRow>

      <ProjectDurationRow project={project} onChange={onChange} />

      <ProjectAttributesRow
        project={project}
        activities={activities}
        regions={regions}
        onChange={onChange}
      />

      <FieldRow label="Additional information" htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          className="max-w-lg"
          placeholder="Anything the Research Office should know about this costing"
          value={project.additional_information}
          onChange={(e) => onChange({ additional_information: e.target.value })}
        />
      </FieldRow>
    </Panel>
  )
}
