import type { RowData } from '@tanstack/react-table'
import type { ReactNode } from 'react'

import type { LookupTables } from '@/types'

import { LookupDataTable, type LookupTableDef } from './LookupDataTable'

export interface LookupTable {
  value: string
  title: string
  render: (lookups: LookupTables) => ReactNode
}

/** Binds a table definition to its row type so one tab can mix row types. */
export const lookupTable = <R extends RowData>(
  def: LookupTableDef<R>,
): LookupTable => ({
  value: def.value,
  title: def.title,
  render: (lookups) => <LookupDataTable def={def} lookups={lookups} />,
})
