import { Derived } from '@/components/shell'

export const DASH = <span className="text-muted-foreground">—</span>

const ratio = (value: number) => `${(value * 100).toFixed(1)}%`

export const percent = (value: number) => <Derived>{ratio(value)} </Derived>
