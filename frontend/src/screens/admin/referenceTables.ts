/**
 * The tables that don't price a costing (#70, #144): changed in place, a row
 * at a time, with no rates version. Non-staff categories look like one of
 * these but are not: their excluded flag prices a costing, so they are a rate
 * table (rateTables.ts).
 */
export type ReferenceTable =
  | 'faculties'
  | 'departments'
  | 'activities'
  | 'regions'
  | 'deliverable_types'
  | 'revenue_categories'

export interface ReferenceField {
  field: string
  label: string
  /** `faculty` is picked from the faculties, by code. */
  kind: 'text' | 'number' | 'faculty'
  /** A name an approved costing shows, which changes there too (#73). */
  named?: boolean
}

export interface ReferenceTableSpec {
  id: ReferenceTable
  label: string
  /** What one row is called, in sentences. */
  noun: string
  /** The primary key. Other records point at it, so it never changes. */
  key: ReferenceField
  fields: ReferenceField[]
  /**
   * Faculties and departments are never removed (#70). A row of the others can
   * be, when nothing uses it; the server says what does when something does.
   */
  removable: boolean
}

const code = { field: 'code', label: 'Code', kind: 'text' } as const
const name = { field: 'name', label: 'Name', kind: 'text', named: true } as const

export const REFERENCE_TABLES: ReferenceTableSpec[] = [
  { id: 'faculties', label: 'Faculties', noun: 'faculty', key: code, fields: [name], removable: false },
  {
    id: 'departments',
    label: 'Departments',
    noun: 'department',
    key: code,
    fields: [
      name,
      { field: 'school', label: 'School', kind: 'text', named: true },
      { field: 'school_code', label: 'School code', kind: 'text' },
      { field: 'budget_unit', label: 'Budget unit', kind: 'text' },
      { field: 'faculty_code', label: 'Faculty', kind: 'faculty' },
    ],
    removable: false,
  },
  { id: 'activities', label: 'Activities', noun: 'activity', key: code, fields: [name], removable: true },
  { id: 'regions', label: 'Regions', noun: 'region', key: code, fields: [name], removable: true },
  { id: 'deliverable_types', label: 'Deliverable types', noun: 'deliverable type', key: code, fields: [name], removable: true },
  {
    id: 'revenue_categories',
    label: 'Revenue categories',
    noun: 'revenue category',
    key: { field: 'budget_ledger_id', label: 'Ledger ID', kind: 'number' },
    fields: [
      { field: 'external_party', label: 'External party', kind: 'text', named: true },
      { field: 'description', label: 'Description', kind: 'text', named: true },
    ],
    removable: true,
  },
]

export const referenceSpec = (id: ReferenceTable) =>
  REFERENCE_TABLES.find((table) => table.id === id) ?? REFERENCE_TABLES[0]
