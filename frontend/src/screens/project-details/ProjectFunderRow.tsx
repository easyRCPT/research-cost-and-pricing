import { FieldRow } from '@/components/shell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettledTextInput } from '@/components/ui/text-input'
import { EXTERNAL_PARTIES, OTHER_FUNDER_CATEGORIES } from '@/lib/constants'
import type { ProjectInfo } from '@/types'

interface ProjectFunderRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectFunderRow({ project, onChange }: ProjectFunderRowProps) {
  return (
    <>
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
            <SettledTextInput
              id="other-funder"
              className="max-w-lg"
              value={project.other_funder}
              onCommit={(other_funder) => onChange({ other_funder })}
            />
          </FieldRow>
        </>
      )}
    </>
  )
}
