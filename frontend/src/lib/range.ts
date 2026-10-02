import { toast } from 'sonner'

/**
 * Every money field is a DecimalField(max_digits=12, decimal_places=2) on the
 * backend, so ten dollar digits and two cents is the most one will take.
 */
export const MAX_MONEY = 9_999_999_999.99

const readable = (n: number) =>
  n.toLocaleString('en-AU', { maximumFractionDigits: 2 })

/**
 * Says what the limit is, for an entry the cell has marked rather than taken.
 *
 * The number stays on screen: it is the reader's to correct, and replacing it
 * with the cap loses what they meant before they have read why. One toast per
 * field, replaced as the user keeps typing.
 */
export const toastOutOfRange = (field: string, min: number, max?: number) =>
  toast.error(
    max === undefined
      ? `${field} must be ${readable(min)} or more`
      : `${field} must be between ${readable(min)} and ${readable(max)}`,
    { id: `range:${field}`, description: 'That entry has not been saved.' },
  )
