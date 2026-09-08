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
import { TextInput, TextareaInput } from '@/components/ui/text-input'
import { useProjectField } from '@/api/budget-lines'

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

  // Typed fields settle in the store; the selects next to them commit at once.
  const title = useProjectField('title')
  const chiefInvestigator = useProjectField('chief_investigator')
  const otherFunder = useProjectField('other_funder')
  const scheme = useProjectField('scheme')
  const additionalInformation = useProjectField('additional_information')

  return (
    <Panel>
      <FieldRow label="Project title" htmlFor="title" required>
        <TextInput id="title" className="max-w-lg" {...title} />
      </FieldRow>

      <FieldRow label="Lead UoM chief investigator" required htmlFor="ci">
        <TextInput id="ci" className="max-w-lg" {...chiefInvestigator} />
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
            <TextInput
              id="other-funder"
              className="max-w-lg"
              {...otherFunder}
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
        <TextInput
          id="scheme"
          className="max-w-sm"
          placeholder="e.g. Discovery Projects 2027"
          {...scheme}
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
        <TextareaInput
          id="notes"
          rows={3}
          className="max-w-lg"
          placeholder="Anything the Research Office should know about this costing"
          {...additionalInformation}
        />
      </FieldRow>
    </Panel>
  )
}
