const DATE = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** 28 Sept 2026. */
export const shortDate = (iso: string) => DATE.format(new Date(iso))
