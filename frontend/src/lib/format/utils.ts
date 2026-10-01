export const money = (n: number) =>
  (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-AU")

export const money2 = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const dash = (n: number) => (n ? money(n) : "—")

/** A fraction as a percentage to one decimal place: 0.3 reads 30.0%. */
export const percent1 = (fraction: number) => `${(fraction * 100).toFixed(1)}%`

export const percent = (a: number, b: number) => (b ? percent1(a / b) : "—")

export const decimal2 = (n: number) => n.toFixed(2)