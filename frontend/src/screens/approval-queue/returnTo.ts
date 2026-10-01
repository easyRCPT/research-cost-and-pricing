/**
 * Where an approver's Back button goes from a costing (#98): the approvals
 * page they opened it from, the queue or the register. Remembered for the tab
 * rather than carried in every editor URL, so moving between the costing's
 * own screens can't lose it.
 */
const KEY = 'rcpt.approvals.from'

export type ApprovalsPage = '/approvals' | '/approvals/register'

export function rememberApprovalsPage(page: ApprovalsPage) {
  try {
    sessionStorage.setItem(KEY, page)
  } catch {
    // Storage refused (a private window): Back falls through to the queue.
  }
}

function remembered(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function approvalsPage(): { label: string; to: ApprovalsPage } {
  return remembered() === '/approvals/register'
    ? { label: 'Register', to: '/approvals/register' }
    : { label: 'Approval queue', to: '/approvals' }
}
