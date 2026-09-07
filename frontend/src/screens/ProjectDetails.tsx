import type { LookupTables, ProjectInfo } from '@/types'
import { FieldRow, Panel } from '@/components/shell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EXTERNAL_PARTIES, OTHER_FUNDER_CATEGORIES } from '@/lib/constants'
import { ProjectAttributesRow } from './project-details/ProjectAttributesRow'
import { ProjectDurationRow } from './project-details/ProjectDurationRow'
import { ProjectDepartmentRow } from './project-details/ProjectDepartmentRow'
import { DraftInput, DraftTextarea } from './project-details/DraftInput'

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
        <DraftInput
          id="title"
          className="max-w-lg"
          value={project.title}
          onCommit={(title) => onChange({ title })}
        />
      </FieldRow>

      <FieldRow label="Lead UoM chief investigator" required htmlFor="ci">
        <DraftInput
          id="ci"
          className="max-w-lg"
          value={project.chief_investigator}
          onCommit={(chief_investigator) => onChange({ chief_investigator })}
        />
      </FieldRow>

      <FieldRow label="External party" required>
        <Select
          value={project.funder}
          onValueChange={(v) => onChange({ funder: v })}
        >
          <SelectTrigger className="w-full max-w-lg">
            <SelectValue placeholder="Select external party" />
          </SelectTrigger>
          <SelectContent>
            {EXTERNAL_PARTIES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      {project.funder === 'Other' && (
        <>
          <FieldRow label="Other party category" htmlFor="other-party-category">
            <Select
              value={project.other_funder_category}
              onValueChange={(v) => onChange({ other_funder_category: v })}
            >
              <SelectTrigger className="w-full max-w-lg">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {OTHER_FUNDER_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Specify Other Funder" htmlFor="other-funder">
            <DraftInput
              id="other-funder"
              className="max-w-lg"
              value={project.other_funder}
              onCommit={(other_funder: string) => onChange({ other_funder })}
            />
          </FieldRow>
        </>
      )}

      <ProjectDepartmentRow
        project={project}
        departments={departments}
        onChange={onChange}
      />

      <FieldRow label="Scheme" htmlFor="scheme" hint="Grants only">
        <DraftInput
          id="scheme"
          className="max-w-sm"
          placeholder="e.g. Discovery Projects 2027"
          value={project.scheme}
          onCommit={(scheme) => onChange({ scheme })}
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
        <DraftTextarea
          id="notes"
          rows={3}
          className="max-w-lg"
          placeholder="Anything the Research Office should know about this costing"
          value={project.additional_information}
          onCommit={(additional_information) =>
            onChange({ additional_information })
          }
        />
      </FieldRow>
    </Panel>
  )
}
