import { type EditorScreen } from '@/components/shell'
import type { LookupTables, ProjectInfo } from '@/types'
import { ProjectDetails } from './ProjectDetails'
import { NonStaffCosts, type NonStaffCostsProps } from './NonStaffCosts'
import { StaffCosts } from './StaffCosts'
import { PriceSummary } from './PriceSummary'
import { AdjustPrice } from './AdjustPrice'
import { CashCoContributions } from './CashCoContributions'
import { BudgetForm } from './BudgetForm'
// TODO: approvals — restore when auth lands.
// import { Approvals } from './Approvals'
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
    case 'staff':
      return <StaffCosts lookups={lookups} />
    case 'cash':
      return <CashCoContributions />
    case 'adjust':
      return <AdjustPrice nonStaff={nonStaff} />
    case 'price':
      return <PriceSummary lookups={lookups} />
    case 'budget':
      return <BudgetForm lookups={lookups} />
    // TODO: approvals — restore when auth lands.
    // case 'approvals':
    //   return <Approvals lookups={lookups} />
    case 'nonstaff':
      return <NonStaffCosts {...nonStaff} lookups={lookups} />
    default:
      return <EmptyStateScreen />
  }
}
