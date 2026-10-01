import { useMe } from '@/api/auth'
import { useBudget } from './detail'

/**
 * Whether this caller may change this budget right now.
 *
 * The owner, and only while it is a draft. Everyone else who can see it -- an
 * approver, a superadmin, the owner once it is submitted -- is reading it, and
 * the server refuses their writes (403 or 409). The screen has to say so up
 * front rather than offer an edit and then report that it failed (#83).
 */
export function useEditable(): boolean {
  const { data: budget } = useBudget()
  return useOwnsBudget() && budget.budget_info.status === 'draft'
}

/** Whether the signed-in user made this budget's project. */
export function useOwnsBudget(): boolean {
  const { data: budget } = useBudget()
  const { data: me } = useMe()
  return me != null && me.user.id === budget.project_info.owner_id
}
