const DATE = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** 28 Sept 2026. */
export const shortDate = (iso: string) => DATE.format(new Date(iso))

const DATE_TIME = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** 28 Sept 2026, 2:32 pm: an audit trail has to tell two changes in an afternoon apart. */
export const dateTime = (iso: string) => DATE_TIME.format(new Date(iso))
