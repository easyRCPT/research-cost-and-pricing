import { type EditorScreen } from '@/components/shell'
import type { LookupTables, ProjectInfo } from '@/types'
import { ProjectDetails } from './ProjectDetails'
import { NonStaffCosts, type NonStaffCostsProps } from './NonStaffCosts'
import { StaffCosts } from './StaffCosts'
import { PriceSummary } from './PriceSummary'
import { InKind } from './InKind'
import { BudgetForm } from './BudgetForm'
import { EmptyStateScreen } from './EmptyStateScreen'

interface EditorScreenContentProps {
  lookups: LookupTables
  screen: EditorScreen
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
  nonStaff: Omit<NonStaffCostsProps, 'lookups'>
  budgetId: number
}

export function EditorScreenContent({
  lookups,
  screen,
  project,
  onChange,
  nonStaff,
  budgetId,
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
    case 'staff':
      return <StaffCosts budgetId={budgetId} lookups={lookups} />
    case 'inkind':
      return (
        <InKind budgetId={budgetId} lookups={lookups} nonStaff={nonStaff} />
      )
    case 'price':
      return <PriceSummary budgetId={budgetId} lookups={lookups} />
    case 'budget':
      return <BudgetForm budgetId={budgetId} lookups={lookups} />
    case 'nonstaff':
      return <NonStaffCosts {...nonStaff} lookups={lookups} />
    default:
      return <EmptyStateScreen />
  }
}
