import { type ComponentProps, useState } from 'react'

import { Input } from '@/components/ui/input'
import { useSettled } from '@/lib/use-settled'
import { cn } from '@/lib/utils'

import { cellField } from './cellField'

/**
 * How long a cell holds what is typed before it is saved.
 *
 * A name or a description is never priced, so there is nothing to see until
 * typing stops and no reason to write once per character. A time or an amount
 * moves every figure below it, so it goes almost at once and the totals keep
 * up with the typing; writes that overlap are collapsed in api/budget/write.
 */
const TEXT_SETTLE_MS = 350

type CellTextProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange'
> & {
  value: string
  /** Absent on a read-only cell, such as the CI's name. */
  onChange?: (value: string) => void
}

/** Free text holds sentences, so it takes the widest default. */
export function CellText({
  className,
  value,
  onChange,
  onBlur,
  ...rest
}: CellTextProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const { change, flush } = useSettled<string>((settled) => {
    setDraft(null)
    onChange?.(settled)
  }, TEXT_SETTLE_MS)

  return (
    <Input
      {...rest}
      className={cn(cellField, 'min-w-44', className)}
      value={draft ?? value}
      onChange={(event) => {
        setDraft(event.target.value)
        change(event.target.value)
      }}
      onBlur={(event) => {
        flush()
        onBlur?.(event)
      }}
    />
  )
}
