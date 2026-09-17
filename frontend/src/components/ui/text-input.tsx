import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useSettled } from '@/lib/use-settled'

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

type Settled<P> = Omit<P, 'value' | 'onChange'> & {
  value: string
  /** Called once typing settles, rather than on every keystroke. */
  onCommit: (value: string) => void
}

/** How long a field keeps what is typed to itself before committing it. */
const SETTLE_MS = 350

/**
 * What is typed, held by the field itself.
 *
 * The draft belongs in the input, not in the screen around it. Put it in the
 * screen and a keystroke re-renders everything on that screen: on Project
 * Details, five query subscriptions and every select beside the field. Held
 * here, a keystroke re-renders one input and the budget hears about it once
 * typing stops.
 */
function useTypedDraft(value: string, onCommit: (value: string) => void) {
  const [draft, setDraft] = useState<string | null>(null)

  const { change, flush } = useSettled<string>((settled) => {
    setDraft(null)
    onCommit(settled)
  }, SETTLE_MS)

  return {
    value: draft ?? value,
    type: (next: string) => {
      setDraft(next)
      change(next)
    },
    // Leaving the field saves it now rather than a third of a second later.
    flush,
  }
}

export function SettledTextInput({
  value,
  onCommit,
  onBlur,
  ...rest
}: Settled<ComponentProps<typeof Input>>) {
  const field = useTypedDraft(value, onCommit)

  return (
    <Input
      {...rest}
      value={field.value}
      onChange={(event) => field.type(event.target.value)}
      onBlur={(event) => {
        field.flush()
        onBlur?.(event)
      }}
    />
  )
}

/** The same, for the multi-line fields. */
export function SettledTextareaInput({
  value,
  onCommit,
  onBlur,
  ...rest
}: Settled<ComponentProps<typeof Textarea>>) {
  const field = useTypedDraft(value, onCommit)

  return (
    <Textarea
      {...rest}
      value={field.value}
      onChange={(event) => field.type(event.target.value)}
      onBlur={(event) => {
        field.flush()
        onBlur?.(event)
      }}
    />
  )
}
