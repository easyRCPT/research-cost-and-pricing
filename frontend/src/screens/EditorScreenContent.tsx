import { type EditorScreen } from '@/components/shell'
import type { LookupTables, ProjectInfo } from '@/types'

import { AdjustPrice } from './AdjustPrice'
import { Approvals } from './Approvals'
import { BudgetForm } from './BudgetForm'
import { CashCoContributions } from './CashCoContributions'
import { EmptyStateScreen } from './EmptyStateScreen'
import { NonStaffCosts, type NonStaffCostsProps } from './NonStaffCosts'
import { PriceSummary } from './PriceSummary'
import { ProjectDetails } from './ProjectDetails'
import { StaffCosts } from './StaffCosts'

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
    case 'staff':
      return <StaffCosts lookups={lookups} />
    case 'cash':
      return <CashCoContributions />
    case 'adjust':
      return <AdjustPrice nonStaff={nonStaff} />
    case 'price':
      return <PriceSummary />
    case 'budget':
      return <BudgetForm lookups={lookups} />
    case 'approvals':
      return <Approvals />
    case 'nonstaff':
      return <NonStaffCosts {...nonStaff} lookups={lookups} />
    default:
      return <EmptyStateScreen />
  }
}
