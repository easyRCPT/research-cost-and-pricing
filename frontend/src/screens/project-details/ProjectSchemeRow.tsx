import { FieldRow } from '@/components/shell'
import { SettledTextInput } from '@/components/ui/text-input'
import type { ProjectInfo } from '@/types'

interface ProjectSchemeRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectSchemeRow({ project, onChange }: ProjectSchemeRowProps) {
  return (
    <FieldRow label="Scheme" htmlFor="scheme" hint="Grants only">
      <SettledTextInput
        id="scheme"
        className="max-w-lg"
        placeholder="e.g. Discovery Projects 2027"
        value={project.scheme}
        onCommit={(scheme) => onChange({ scheme })}
      />
    </FieldRow>
  )
}
