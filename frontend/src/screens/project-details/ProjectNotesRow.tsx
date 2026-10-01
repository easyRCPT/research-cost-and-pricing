import { FieldRow } from '@/components/shell'
import { SettledTextareaInput } from '@/components/ui/text-input'
import type { ProjectInfo } from '@/types'

interface ProjectNotesRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectNotesRow({ project, onChange }: ProjectNotesRowProps) {
  return (
    <FieldRow label="Additional information" htmlFor="notes">
      <SettledTextareaInput
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
  )
}
