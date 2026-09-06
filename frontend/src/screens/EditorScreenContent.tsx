import { type EditorScreen } from '@/components/shell'
import type { ProjectInfo } from '@/types'
import { ProjectDetails } from './ProjectDetails'
import { NonStaffCosts, type NonStaffCostsProps } from './NonStaffCosts'
import { EmptyStateScreen } from './EmptyStateScreen'

interface EditorScreenContentProps {
  screen: EditorScreen
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
  nonStaff: NonStaffCostsProps
}

export function EditorScreenContent({
  screen,
  project,
  onChange,
  nonStaff,
}: EditorScreenContentProps) {
  switch (screen) {
    case 'details':
      return <ProjectDetails project={project} onChange={onChange} />
    case 'nonstaff':
      return <NonStaffCosts {...nonStaff} />
    default:
      return <EmptyStateScreen />
  }
}
