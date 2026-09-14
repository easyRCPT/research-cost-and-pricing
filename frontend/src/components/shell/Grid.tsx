import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Align = 'left' | 'right' | 'center'

const ALIGN: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

/** Sizes to its content and scrolls rather than squeezing the year columns.
 *  The height cap is what lets the head pin: it makes the grid, not the page,
 *  the thing that scrolls vertically. */
export function Grid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    // The cells draw the frame themselves (see grid-table). A border on a box
    // around them either scrolls away, taking the head's top edge and rounded
    // corners with it, or sits outside the scrollbars instead of inside them.
    <div
      className={cn(
        'scroll-persist max-h-[70svh] overflow-scroll overscroll-x-none',
        'print:max-h-none print:overflow-visible',
        className,
      )}
    >
      <table className="grid-table w-max min-w-full text-[13px]">
        {children}
      </table>
    </div>
  )
}

export function Th({
  align = 'left',
  className,
  ...rest
}: ComponentProps<'th'> & { align?: Align }) {
  return (
    <th
      {...rest}
      className={cn(
        'border-r border-b bg-muted px-1.5 py-1 align-bottom font-semibold whitespace-nowrap',
        ALIGN[align],
        className,
      )}
    />
  )
}

export function Td({
  align = 'left',
  className,
  ...rest
}: ComponentProps<'td'> & { align?: Align }) {
  return (
    <td
      {...rest}
      className={cn(
        'border-r border-b px-2 py-1 align-middle',
        ALIGN[align],
        className,
      )}
    />
  )
}

/** A read-only computed cell. */
export function Calc({ className, ...rest }: ComponentProps<'td'>) {
  return (
    <td
      {...rest}
      className={cn(
        'tabular border-r border-b bg-muted/40 px-2 py-1 text-right align-middle',
        className,
      )}
    />
  )
}

export function FootTd({ className, ...rest }: ComponentProps<'td'>) {
  return (
    <td
      {...rest}
      className={cn(
        'tabular border-r bg-muted px-2 py-1.5 text-right font-semibold',
        className,
      )}
    />
  )
}

const cellField =
  'h-8 w-full rounded-none border-0 bg-transparent px-2 text-[13px] md:text-[13px] ' +
  'focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:ring-0 ' +
  'disabled:bg-muted/40 disabled:opacity-100'

/** Wraps an entry cell so the field, not the padding, owns the whole cell. */
export function CellTd({ className, ...rest }: ComponentProps<typeof Td>) {
  return <Td {...rest} className={cn('p-0', className)} />
}

/** Free text holds sentences, so it takes the widest default. */
export function CellText({ className, ...rest }: ComponentProps<typeof Input>) {
  return <Input {...rest} className={cn(cellField, 'min-w-44', className)} />
}

/** Numbers only ever need room for a few digits. A `prefix` such as `$` sits
 *  against the left edge of the cell, clear of the right-aligned digits. */
export function CellNumber({
  className,
  prefix,
  ...rest
}: ComponentProps<typeof NumberInput> & { prefix?: string }) {
  const field = (
    <NumberInput
      {...rest}
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

interface CellChoiceProps {
  value: string
  options: readonly string[]
  /** Every option the column could ever hold, when `options` depends on another
   *  cell. Sizing against these keeps the column from resizing later. */
  sizeOptions?: readonly string[]
  placeholder?: string
  disabled?: boolean
  className?: string
  onChange: (value: string) => void
}

/** Where a choice column stops growing and starts truncating instead. */
const choiceMaxWidth = 'max-w-56'

// The trigger line-clamps its value; in a cell we want one truncated line.
const choiceValue =
  '*:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:block ' +
  '*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate'

export function CellChoice({
  value,
  options,
  sizeOptions = options,
  placeholder,
  disabled,
  className,
  onChange,
}: CellChoiceProps) {
  return (
    // The invisible options alone size the column, so it opens at the width of
    // the longest thing it can ever hold and stays there. The trigger is taken
    // out of flow because an in-flow one measures as wide as its own value, and
    // the column would jump the first time a long value was picked.
    <div className={cn('relative h-8', className)}>
      {sizeOptions.map((option) => (
        <span
          key={option}
          aria-hidden
          className={cn(
            'invisible block h-0 pr-8 pl-2 whitespace-nowrap',
            choiceMaxWidth,
          )}
        >
          {option}
        </span>
      ))}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          title={value || undefined}
          className={cn(
            cellField,
            choiceValue,
            'absolute inset-0 justify-between',
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          sideOffset={0}
          // Clear of the shared min-width floor, which would push a narrow
          // column's list past its edge.
          className="min-w-0 rounded-md"
        >
          {options.map((option) => (
            // Padding sits on the item, not the content, so an option measures
            // no wider than the sizer that reserved it; longer ones wrap.
            <SelectItem
              key={option}
              value={option}
              className="pr-6 pl-1 text-[13px]"
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
