import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

interface NumberInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'min'
> {
  value: number
  onChange: (value: number) => void
  min?: number
}

export function NumberInput({
  value,
  onChange,
  min,
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
        onChange(min === undefined ? parsed : Math.max(min, parsed))
      }}
      onBlur={(e) => {
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}
