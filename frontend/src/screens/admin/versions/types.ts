import type { PricedOn } from '@/api/admin-lookups'

export interface RatesMoved {
  title: string
  description: string
  /** Who was priced on the version the rates moved away from, if they did. */
  replaced: PricedOn | null
}
