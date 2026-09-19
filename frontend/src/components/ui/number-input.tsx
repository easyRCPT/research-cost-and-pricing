import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

const outside = (value: number, min?: number, max?: number) =>
  (min !== undefined && value < min) || (max !== undefined && value > max)

interface NumberInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'min' | 'max'
> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Called with what was typed when it fell outside min/max. */
  onOutOfRange?: (value: number) => void
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  onOutOfRange,
  onFocus,
  onBlur,
  ...rest
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <Input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={draft ?? String(value)}
      onFocus={(e) => {
        setDraft(String(value))
        onFocus?.(e)
      }}
      aria-invalid={draft !== null && outside(Number(draft), min, max)}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        const parsed = raw === '' ? 0 : Number(raw)
        if (!Number.isFinite(parsed)) return
        // Out of range is reported and marked, never rewritten: replacing what
        // someone typed with the cap loses the number before they have read
        // why it was refused.
        if (outside(parsed, min, max)) {
          onOutOfRange?.(parsed)
          return
        }
        onChange(parsed)
      }}
      onBlur={(e) => {
        // An out-of-range entry stays on screen. Anything else goes back to
        // showing the stored value.
        if (!outside(Number(draft ?? value), min, max)) setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}
