import type { LookupTables, ProjectInfo } from '@/types'
import { Panel } from '@/components/shell'
import { ProjectAttributesRow } from './project-details/ProjectAttributesRow'
import { ProjectDurationRow } from './project-details/ProjectDurationRow'
import { ProjectDepartmentRow } from './project-details/ProjectDepartmentRow'
import { ProjectFunderRow } from './project-details/ProjectFunderRow'
import { ProjectInvestigatorRow } from './project-details/ProjectInvestigatorRow'
import { ProjectNotesRow } from './project-details/ProjectNotesRow'
import { ProjectSchemeRow } from './project-details/ProjectSchemeRow'
import { ProjectTitleRow } from './project-details/ProjectTitleRow'

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
      <ProjectTitleRow project={project} onChange={onChange} />

      <ProjectInvestigatorRow project={project} onChange={onChange} />

      <ProjectFunderRow project={project} onChange={onChange} />

      <ProjectDepartmentRow
        project={project}
        departments={departments}
        onChange={onChange}
      />

      <ProjectSchemeRow project={project} onChange={onChange} />

      <ProjectDurationRow project={project} onChange={onChange} />

      <ProjectAttributesRow
        project={project}
        activities={activities}
        regions={regions}
        onChange={onChange}
      />

      <ProjectNotesRow project={project} onChange={onChange} />
    </Panel>
  )
}
