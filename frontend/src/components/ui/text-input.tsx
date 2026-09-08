import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Bound<P> = Omit<P, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
}

/** An Input that reports the value typed, so a field hook spreads straight in. */
export function TextInput({
  value,
  onChange,
  ...rest
}: Bound<ComponentProps<typeof Input>>) {
  return (
    <Input
      {...rest}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

/** The same, for the multi-line fields. */
export function TextareaInput({
  value,
  onChange,
  ...rest
}: Bound<ComponentProps<typeof Textarea>>) {
  return (
    <Textarea
      {...rest}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
