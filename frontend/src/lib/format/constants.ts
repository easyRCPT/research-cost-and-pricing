const UPPERCASE_WORDS = new Set(['uom', 'gst', 'eba'])

/** `override_uom_oncosts` as a person reads it: "Override UOM Oncosts". */
export const constantName = (name: string) =>
  name
    .split('_')
    .map((word) =>
      UPPERCASE_WORDS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')

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
