import { type EditorScreen } from '@/components/shell'
import type { LookupTables, ProjectInfo } from '@/types'
import { ProjectDetails } from './ProjectDetails'
import { NonStaffCosts, type NonStaffCostsProps } from './NonStaffCosts'
import { EmptyStateScreen } from './EmptyStateScreen'

interface EditorScreenContentProps {
  lookups: LookupTables
  screen: EditorScreen
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
  nonStaff: Omit<NonStaffCostsProps, 'lookups'>
}

export function EditorScreenContent({
  lookups,
  screen,
  project,
  onChange,
  nonStaff,
}: EditorScreenContentProps) {
  switch (screen) {
    case 'details':
      return (
        <ProjectDetails
          project={project}
          onChange={onChange}
          lookups={lookups}
        />
      )
    case 'nonstaff':
      return <NonStaffCosts {...nonStaff} lookups={lookups} />
    default:
      return <EmptyStateScreen />
  }
}
