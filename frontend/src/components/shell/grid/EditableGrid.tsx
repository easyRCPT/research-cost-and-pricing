import { Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

import { Grid, Td } from './Grid'

/** A Grid of editable rows with the Add row button beneath it. */
export function EditableGrid({
  children,
  onAdd,
}: {
  children: ReactNode
  onAdd: () => void
}) {
  return (
    <>
      <Grid>{children}</Grid>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => onAdd()}
      >
        <Plus /> Add row
      </Button>
    </>
  )
}

/** The cell that removes its row. */
export function RemoveRowButton({
  label,
  disabled,
  className,
  onRemove,
}: {
  label: string
  disabled?: boolean
  className?: string
  onRemove: () => void
}) {
  return (
    <Td align="center" className={className}>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={disabled}
        aria-label={label}
        className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
        onClick={onRemove}
      >
        <X />
      </Button>
    </Td>
  )
}

/** The row a grid shows while it has no lines. */
export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: ReactNode
}) {
  return (
    <tr>
      <Td colSpan={colSpan} className="py-6 text-center text-muted-foreground">
        {children}
      </Td>
    </tr>
  )
}
