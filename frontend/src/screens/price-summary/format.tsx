import { Derived } from '@/components/shell'
import { percent1 } from '@/lib/format/utils'

export const DASH = <span className="text-muted-foreground">—</span>

export const percent = (value: number) => <Derived>{percent1(value)} </Derived>
