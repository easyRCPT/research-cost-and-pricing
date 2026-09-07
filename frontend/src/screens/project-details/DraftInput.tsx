import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface DraftFieldProps {
  id?: string
  className?: string
  placeholder?: string
  rows?: number
  value: string
  onCommit: (value: string) => void
}

/**
 * Holds what is typed locally and reports it on blur. Without this every
 * keystroke re-renders the whole screen, including the 183-item department
 * select, which is enough to feel laggy.
 */
function useDraft(value: string, onCommit: (value: string) => void) {
  const [draft, setDraft] = useState<string | null>(null)

  return {
    value: draft ?? value,
    onChange: (next: string) => setDraft(next),
    onBlur: () => {
      if (draft !== null && draft !== value) onCommit(draft)
      setDraft(null)
    },
  }
}

export function DraftInput({
  value,
  onCommit,
  ...rest
}: Omit<DraftFieldProps, 'rows'>) {
  const draft = useDraft(value, onCommit)
  return (
    <Input
      {...rest}
      value={draft.value}
      onChange={(event) => draft.onChange(event.target.value)}
      onBlur={draft.onBlur}
    />
  )
}

export function DraftTextarea({ value, onCommit, ...rest }: DraftFieldProps) {
  const draft = useDraft(value, onCommit)
  return (
    <Textarea
      {...rest}
      value={draft.value}
      onChange={(event) => draft.onChange(event.target.value)}
      onBlur={draft.onBlur}
    />
  )
}
