import { toast } from 'sonner'

/**
 * Every money field is a DecimalField(max_digits=12, decimal_places=2) on the
 * backend, so ten dollar digits and two cents is the most one will take.
 */
export const MAX_MONEY = 9_999_999_999.99

const readable = (n: number) =>
  n.toLocaleString('en-AU', { maximumFractionDigits: 2 })

/**
 * Number cells clamp silently, so an entry over the cap looks like it was taken.
 * One toast per field, replaced as the user keeps typing.
 */
export const toastOutOfRange = (field: string, min: number, max?: number) =>
  toast.error(
    max === undefined
      ? `${field} must be ${readable(min)} or more`
      : `${field} must be between ${readable(min)} and ${readable(max)}`,
    { id: `range:${field}`, description: 'Your entry was adjusted to fit.' },
  )
