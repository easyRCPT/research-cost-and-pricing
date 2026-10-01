import type { RateTable } from '@/api/admin-lookups'
import type { LookupTabValue } from '@/components/lookups-tabs'
import type { ReferenceTable } from '@/screens/admin/referenceTables'

/**
 * What each tab of the costing screen's lookup tables holds here. A rate table
 * is edited as part of one reviewed set, a reference table a row at a time,
 * and a `view` is the costing screen's own read-only table, which nothing here
 * edits.
 */
export type AdminTable =
  | { kind: 'rate'; id: RateTable }
  | { kind: 'reference'; id: ReferenceTable }
  | { kind: 'view'; id: string }

const rate = (id: RateTable): AdminTable => ({ kind: 'rate', id })
const reference = (id: ReferenceTable): AdminTable => ({ kind: 'reference', id })

export const ADMIN_TABLES: Record<LookupTabValue, AdminTable[]> = {
  constants: [rate('calculation_constants')],
  rates: [rate('salary_rates'), { kind: 'view', id: 'caps' }, rate('salary_rate_multipliers')],
  eba: [rate('eba_increases')],
  oncosts: [rate('on_cost_rates')],
  orgunits: [reference('faculties'), reference('departments')],
  expenses: [rate('non_staff_cost_categories')],
  attributes: [reference('activities'), reference('regions')],
  deliverables: [reference('deliverable_types'), reference('revenue_categories')],
}

/** The tab a rate table is on, to show it when the server refuses a change to it. */
export const tabOf = (id: RateTable) =>
  (Object.keys(ADMIN_TABLES) as LookupTabValue[]).find((tab) =>
    ADMIN_TABLES[tab].some((table) => table.id === id),
  )!
