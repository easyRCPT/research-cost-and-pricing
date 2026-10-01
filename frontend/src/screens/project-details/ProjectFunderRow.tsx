import { FieldRow } from '@/components/shell'
import { OptionSelect } from '@/components/ui/option-select'
import { EXTERNAL_PARTIES, OTHER_FUNDER_CATEGORIES } from '@/lib/constants'
import type { ProjectInfo } from '@/types'

import { ProjectTextRow } from './ProjectTextRow'

interface ProjectFunderRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectFunderRow({ project, onChange }: ProjectFunderRowProps) {
  return (
    <>
      <FieldRow label="External party" required>
        <OptionSelect
          value={project.funder}
          onValueChange={(v) => onChange({ funder: v })}
          options={EXTERNAL_PARTIES}
          placeholder="Select external party"
          className="w-full max-w-lg"
        />
      </FieldRow>

      {project.funder === 'Other' && (
        <>
          <FieldRow label="Other party category" htmlFor="other-party-category">
            <OptionSelect
              value={project.other_funder_category}
              onValueChange={(v) => onChange({ other_funder_category: v })}
              options={OTHER_FUNDER_CATEGORIES}
              placeholder="Select a category"
              className="w-full max-w-lg"
            />
          </FieldRow>

          <ProjectTextRow
            project={project}
            onChange={onChange}
            field="other_funder"
            label="Specify Other Funder"
            id="other-funder"
          />
        </>
      )}
    </>
  )
}
