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

/** The local day an instant falls on, as YYYY-MM-DD: the day a person sees it under. */
export const isoDay = (iso: string) => {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
