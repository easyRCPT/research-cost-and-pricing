export const money = (n: number) =>
  (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-AU")

export const money2 = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const dash = (n: number) => (n ? money(n) : "—")

export const percent = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—")

export const decimal2 = (n: number) => n.toFixed(2)
