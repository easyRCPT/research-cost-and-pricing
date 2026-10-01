import { useBudget } from '@/api/budget'
import { isApprover, SUPERADMIN, useMe } from '@/api/auth'
import { approvalsPage } from '@/screens/approval-queue/returnTo'

export function useBackTarget() {
  const { data: budget } = useBudget()
  const { data: me } = useMe()
  const someoneElses = !!me && me.user.id !== budget.project_info.owner_id
  // Back to where they came from: an administrator from the register, an
  // approver to the approvals page they opened it from (#98), the owner to
  // their projects.
  return someoneElses && me.groups.includes(SUPERADMIN)
    ? { label: 'Project register', to: '/admin/projects' as const }
    : someoneElses && isApprover(me)
      ? approvalsPage()
      : null
}
