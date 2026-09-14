import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

/**
 * A number field you can actually clear. Bound straight to a number, an empty
 * field parses back to 0 and re-renders as "0", so the digit cannot be deleted.
 * This keeps what you typed while the field has focus and normalises on blur.
 */
export function NumberInput({
  value, onChange, clamp, ...rest
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: number
  onChange: (value: number) => void
  /** Applied before the value is committed — used for the 0 and FTE bounds. */
  clamp?: (value: number) => number
}) {
  const [draft, setDraft] = useState(() => String(value))

  // Pull in changes made elsewhere (a clamp, or a row reset) without stomping
  // on a half-typed "0." that still parses to the value we already hold.
  useEffect(() => {
    setDraft((current) => (Number(current) === value ? current : String(value)))
  }, [value])

  return (
    <Input
      {...rest}
      type="number"
      value={draft}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        const parsed = raw === "" ? 0 : Number(raw)
        if (Number.isFinite(parsed)) onChange(clamp ? clamp(parsed) : parsed)
      }}
      onBlur={(e) => {
        setDraft(String(value))
        rest.onBlur?.(e)
      }}
    />
  )
}
