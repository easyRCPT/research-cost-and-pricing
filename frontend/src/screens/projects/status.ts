import type { Status } from '@/types'

/** models.py Budget.Status, in the same words the backend would display. */
export const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  hod_review: 'Head of Department review',
  dean_review: 'Dean review',
  approved: 'Approved',
  withdrawn: 'Withdrawn',
}
