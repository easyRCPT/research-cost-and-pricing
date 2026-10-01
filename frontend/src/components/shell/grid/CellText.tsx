import type { ComponentProps } from 'react'

import { SettledTextInput } from '@/components/ui/text-input'
import { cn } from '@/lib/utils'

import { cellField } from './cellField'

type CellTextProps = Omit<
  ComponentProps<typeof SettledTextInput>,
  'onCommit'
> & {
  /** Absent on a read-only cell, such as the CI's name. */
  onChange?: (value: string) => void
}

/** Free text holds sentences, so it takes the widest default. */
export function CellText({ className, onChange, ...rest }: CellTextProps) {
  return (
    <SettledTextInput
      {...rest}
      className={cn(cellField, 'min-w-44', className)}
      onCommit={(value) => onChange?.(value)}
    />
  )
}
