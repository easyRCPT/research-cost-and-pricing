import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

const clamp = (value: number, min?: number, max?: number) => {
  const floored = min === undefined ? value : Math.max(min, value)
  return max === undefined ? floored : Math.min(max, floored)
}

interface NumberInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'min' | 'max'
> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
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
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        const parsed = raw === '' ? 0 : Number(raw)
        if (!Number.isFinite(parsed)) return
        onChange(clamp(parsed, min, max))
      }}
      onBlur={(e) => {
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}
