import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

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

/** Wraps an entry cell so the field, not the padding, owns the whole cell. */
export function CellTd({ className, ...rest }: ComponentProps<typeof Td>) {
  return <Td {...rest} className={cn('p-0', className)} />
}
