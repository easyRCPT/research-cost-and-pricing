export const money = (n: number) =>
  (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-AU")

export const money2 = (n: number) =>
  n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const dash = (n: number) => (n ? money(n) : "—")

/** A fraction as a percentage to one decimal place: 0.3 reads 30.0%. */
export const percent1 = (fraction: number) => `${(fraction * 100).toFixed(1)}%`

export const percent = (a: number, b: number) => (b ? percent1(a / b) : "—")

export const decimal2 = (n: number) => n.toFixed(2)

const UPPERCASE_WORDS = new Set(["uom", "gst", "eba"])

/** A snake_case name as a person reads it: `override_uom_oncosts` is "Override UOM oncosts". */
export const displayName = (name: string) =>
  name
    .split("_")
    .map((word, i) => {
      if (UPPERCASE_WORDS.has(word)) return word.toUpperCase()
      return i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    })
    .join(" ")
