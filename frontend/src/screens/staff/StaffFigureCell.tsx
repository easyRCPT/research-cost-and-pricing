import { Calc, Derived } from '@/components/shell'
import { useDash } from '@/lib/format/currency'

interface StaffFigureCellProps {
  value: number
}

export function StaffFigureCell({ value }: StaffFigureCellProps) {
  const dash = useDash()
  return (
    <Calc className={value ? undefined : 'text-muted-foreground'}>
      <Derived>{dash(value)}</Derived>
    </Calc>
  )
}
