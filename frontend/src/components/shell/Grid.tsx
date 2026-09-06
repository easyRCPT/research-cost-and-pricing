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

/** Sizes to its content and scrolls sideways rather than squeezing the year columns. */
export function Grid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-md border', className)}>
      <table className="w-max min-w-full border-collapse text-[13px]">
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
        'border-r border-b bg-muted px-2 py-1.5 align-bottom font-semibold whitespace-nowrap last:border-r-0',
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
        'border-r border-b px-2 py-1 align-middle last:border-r-0',
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
        'tabular border-r border-b bg-muted/40 px-2 py-1 text-right align-middle last:border-r-0',
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
        'tabular border-r bg-muted px-2 py-1.5 text-right font-semibold last:border-r-0',
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

export function CellText({ className, ...rest }: ComponentProps<typeof Input>) {
  return <Input {...rest} className={cn(cellField, className)} />
}

export function CellNumber({
  className,
  ...rest
}: ComponentProps<typeof NumberInput>) {
  return (
    <NumberInput
      {...rest}
      className={cn(cellField, 'no-spin tabular text-right', className)}
    />
  )
}

interface CellChoiceProps {
  value: string
  options: readonly string[]
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function CellChoice({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: CellChoiceProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn(cellField, 'justify-between')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
