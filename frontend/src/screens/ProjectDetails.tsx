import { Panel } from '@/components/shell'
import type { LookupTables, ProjectInfo } from '@/types'

import { ProjectAttributesRow } from './project-details/ProjectAttributesRow'
import { ProjectDepartmentRow } from './project-details/ProjectDepartmentRow'
import { ProjectDurationRow } from './project-details/ProjectDurationRow'
import { ProjectFunderRow } from './project-details/ProjectFunderRow'
import { ProjectTextRow } from './project-details/ProjectTextRow'

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

  // Each typed field holds what is typed itself and commits once it settles,
  // so a keystroke never re-renders this screen and the selects on it. The
  // selects commit at once, having nothing to wait for.
  return (
    <Panel>
      <ProjectTextRow
        project={project}
        onChange={onChange}
        field="title"
        label="Project title"
        id="title"
        required
      />

      <ProjectTextRow
        project={project}
        onChange={onChange}
        field="chief_investigator"
        label="Lead UoM chief investigator"
        id="ci"
        required
      />

      <ProjectFunderRow project={project} onChange={onChange} />

      <ProjectDepartmentRow
        project={project}
        departments={departments}
        onChange={onChange}
      />

      <ProjectTextRow
        project={project}
        onChange={onChange}
        field="scheme"
        label="Scheme"
        id="scheme"
        hint="Grants only"
        placeholder="e.g. Discovery Projects 2027"
      />

      <ProjectDurationRow project={project} onChange={onChange} />

      <ProjectAttributesRow
        project={project}
        activities={activities}
        regions={regions}
        onChange={onChange}
      />

      <ProjectTextRow
        project={project}
        onChange={onChange}
        field="additional_information"
        label="Additional information"
        id="notes"
        rows={3}
        placeholder="Anything the Research Office should know about this costing"
      />
    </Panel>
  )
}
