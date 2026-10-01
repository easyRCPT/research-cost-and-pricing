import type { Key, Values } from '@/screens/admin/stagedChanges'

import type { Refused } from './types'

/** One row of a rate table as it reads with whatever is staged against it. */
export interface RateLine {
  key: Key
  about?: { name: string; detail?: string }
  values: Values
  was: Values | null
  added: boolean
  removed: boolean
  refusal: Refused
  /** The key fields and the row's name, for the search. */
  search: string
  onChange: (values: Values) => void
  onRemove?: () => void
  onUndo: () => void
}

export const isChanged = (line: RateLine) =>
  line.was !== null || line.added || line.removed
