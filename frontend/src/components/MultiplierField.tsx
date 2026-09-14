import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { RECOVERY } from "@/lib/rcpt-engine"

/**
 * Number entry that keeps the raw keystrokes while focused and settles to two
 * decimals on blur, so a multiplier reads as 1.70 rather than 1.7. Out-of-range
 * values are pulled back to the policy bounds when the field is left.
 */
export function MultiplierField({
  value, onChange, disabled, className,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <Input
      type="number"
      step={RECOVERY.step}
      min={RECOVERY.min}
      max={RECOVERY.max}
      disabled={disabled}
      className={cn("tabular w-[86px] bg-white text-right", className)}
      value={draft ?? value.toFixed(2)}
      onChange={(e) => {
        setDraft(e.target.value)
        const parsed = Number(e.target.value)
        if (Number.isFinite(parsed)) onChange(parsed)
      }}
      onBlur={() => {
        setDraft(null)
        const clamped = Math.min(RECOVERY.max, Math.max(RECOVERY.min, value || RECOVERY.min))
        if (clamped !== value) onChange(clamped)
      }}
    />
  )
}
