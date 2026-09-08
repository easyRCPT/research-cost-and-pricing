import { Derived } from '@/components/shell'
import { money } from '@/lib/format/utils'

export const DASH = <span className="text-muted-foreground">—</span>

const ratio = (value: number) => `${(value * 100).toFixed(1)}%`

export const amount = (value: number) => <Derived>{money(value)}</Derived>
export const percent = (value: number) => <Derived>{ratio(value)} </Derived>

export const signed = (value: number) => (
  <Derived>
    <span className={value < 0 ? 'text-bad' : 'text-good'}>{money(value)}</span>
  </Derived>
)
