import type { Status } from '@/types'

/** Labels for models.py Budget.Status */
export const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  hod_review: 'Head of Department review',
  dean_review: 'Dean review',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

/** The same statuses from the project owner's side, who is it waiting on  */
export const AWAITING_LABELS: Record<Status, string> = {
  draft: 'Draft',
  submitted: 'Awaiting Head of Department',
  hod_review: 'Awaiting Head of Department',
  dean_review: 'Awaiting Dean',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export function isDraftStatus(status: Status): status is 'draft' {
  return status === 'draft'
}
