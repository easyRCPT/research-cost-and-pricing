import { FieldRow } from '@/components/shell'
import { SettledTextInput } from '@/components/ui/text-input'
import type { ProjectInfo } from '@/types'

interface ProjectInvestigatorRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectInvestigatorRow({
  project,
  onChange,
}: ProjectInvestigatorRowProps) {
  return (
    <FieldRow label="Lead UoM chief investigator" required htmlFor="ci">
      <SettledTextInput
        id="ci"
        className="max-w-lg"
        value={project.chief_investigator}
        onCommit={(chief_investigator) => onChange({ chief_investigator })}
      />
    </FieldRow>
  )
}
