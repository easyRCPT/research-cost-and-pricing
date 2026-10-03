/**
 * The constants held as rates: a decimal, 0.30 for 30% (#151). Display only:
 * which values the server accepts is the server's to say.
 */
export const PERCENT_CONSTANTS = new Set([
  'default_margin',
  'minimum_margin',
  'gst_rate',
  'max_payroll_tax',
  'override_uom_oncosts',
])

/** 0.3 as "30%", to the precision it was entered at. */
export const asPercent = (fraction: number) =>
  `${Number((fraction * 100).toFixed(4)).toLocaleString('en-AU', { maximumFractionDigits: 4 })}%`
