import { Calc, Derived } from '@/components/shell'
import { useDash } from '@/lib/format/currency'
import { cn } from '@/lib/utils'

interface StaffFigureCellProps {
  value: number
  excluded: boolean
  struck?: boolean
}

export function StaffFigureCell({
  value,
  excluded,
  struck = false,
}: StaffFigureCellProps) {
  const dash = useDash()
  return (
    <Calc
      className={cn(
        !excluded && value ? undefined : 'text-muted-foreground',
        struck && excluded && 'line-through',
      )}
    >
      <Derived>{dash(excluded ? 0 : value)}</Derived>
    </Calc>
  )
}
