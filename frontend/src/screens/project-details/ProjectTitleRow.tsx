import { FieldRow } from '@/components/shell'
import { SettledTextInput } from '@/components/ui/text-input'
import type { ProjectInfo } from '@/types'

interface ProjectTitleRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectTitleRow({ project, onChange }: ProjectTitleRowProps) {
  return (
    <FieldRow label="Project title" htmlFor="title" required>
      <SettledTextInput
        id="title"
        className="max-w-lg"
        value={project.title}
        onCommit={(title) => onChange({ title })}
      />
    </FieldRow>
  )
}
