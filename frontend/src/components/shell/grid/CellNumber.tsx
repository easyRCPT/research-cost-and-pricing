import type { ComponentProps } from 'react'

import { NumberInput } from '@/components/ui/number-input'
import { useSettled } from '@/lib/use-settled'
import { cn } from '@/lib/utils'

import { cellField } from './cellField'

// A time or an amount moves every figure below it, so it goes almost at once.
const NUMBER_SETTLE_MS = 150

/** Numbers only ever need room for a few digits. A `prefix` such as `$` sits
 *  against the left edge of the cell, clear of the right-aligned digits. */
export function CellNumber({
  className,
  prefix,
  onChange,
  onBlur,
  ...rest
}: ComponentProps<typeof NumberInput> & { prefix?: string }) {
  // NumberInput already holds what is being typed, so only the saving settles.
  const { change, flush } = useSettled<number>(onChange, NUMBER_SETTLE_MS)

  const field = (
    <NumberInput
      {...rest}
      onChange={change}
      onBlur={(event) => {
        flush()
        onBlur?.(event)
      }}
      className={cn(
        cellField,
        'no-spin tabular w-20 text-right',
        prefix && 'pl-5',
        className,
      )}
    />
  )
  if (!prefix) return field
  return (
    <div className="relative flex">
      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[13px] text-muted-foreground">
        {prefix}
      </span>
      {field}
    </div>
  )
}
