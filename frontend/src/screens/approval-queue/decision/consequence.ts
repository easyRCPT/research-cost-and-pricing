import type { Decision, QueueRow } from '@/api/approvals'
import { money } from '@/lib/format/utils'

/**
 * What confirming will do, in a sentence, because "approve" means three
 * different things depending on where the costing is (#84).
 */
export function consequence(row: QueueRow, decision: Decision): string {
  const price = money(row.budget.total_price_inc_gst)
  const deanNeeded = row.dean_triggers.length > 0

  if (decision === 'reject') {
    return `It goes back to ${row.budget.submitted_by} as rejected. They can clone it into a new draft, revise it and submit again.`
  }
  if (row.level === 'faculty') {
    return `This is the final authorisation. It becomes approved at ${price} including GST, and that price is what goes to the funder.`
  }
  if (deanNeeded) {
    return 'It moves to the Dean for a second authorisation. Nothing is final until they decide.'
  }
  return `It becomes approved at ${price} including GST. No Dean is needed, so your decision finishes it.`
}
