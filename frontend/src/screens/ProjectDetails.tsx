import { useBudget, useUpdateProject } from '@/api/budget'
import { useLookups } from '@/api/lookups'
import { Panel } from '@/components/shell'

import { ProjectAttributesRow } from './project-details/ProjectAttributesRow'
import { ProjectDepartmentRow } from './project-details/ProjectDepartmentRow'
import { ProjectDurationRow } from './project-details/ProjectDurationRow'
import { ProjectFunderRow } from './project-details/ProjectFunderRow'
import { ProjectTextRow } from './project-details/ProjectTextRow'

export function ProjectDetails() {
  const { data: budget } = useBudget()
  const { data: lookups } = useLookups()
  const onChange = useUpdateProject()

  const project = budget.project_info
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
