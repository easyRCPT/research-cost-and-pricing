import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useReferenceWrite } from '@/api/admin-lookups'
import { columnHelper, DataTable, type DataTableFilter } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { AddRowDialog } from '@/screens/admin/AddRowDialog'
import { ReferenceActions } from '@/screens/admin/reference/ReferenceActions'
import {
  type Faculty,
  facultyOptions,
  type Refusal,
  refusalOf,
  type Row,
  text,
} from '@/screens/admin/reference/shared'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

/** A table with more rows than this gets a search and filters. */
const FILTER_FROM_ROWS = 15

interface ReferenceLine {
  row: Row
  key: string
  /** Each field as it reads, a faculty by its name. */
  shown: Record<string, string>
  unassigned: boolean
  search: string
  faculties: Faculty[]
}

function referenceColumns(spec: ReferenceTableSpec) {
  const col = columnHelper<ReferenceLine>()
  return col.columns([
    col.accessor('key', {
      header: spec.key.label,
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">
          {row.original.key}
          {row.original.unassigned && (
            <Badge variant="destructive" className="ml-2">
              Unassigned
            </Badge>
          )}
        </span>
      ),
    }),
    ...spec.fields.map((f) =>
      col.accessor((line) => line.shown[f.field], {
        id: f.field,
        header: f.label,
        cell: ({ getValue }) => getValue() || '—',
      }),
    ),
    col.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <ReferenceActions
          spec={spec}
          row={row.original.row}
          faculties={row.original.faculties}
        />
      ),
      meta: { className: 'w-32' },
    }),
  ])
}

/**
 * A reference table (#70, #144): rows that don't price a costing, saved one
 * at a time with no rates version. A key (a code, a ledger ID) is what other
 * records point at, so it is entered once and never edited.
 */
export function ReferenceDataTable({
  spec,
  rows,
  faculties,
  unassigned,
}: {
  spec: ReferenceTableSpec
  rows: Row[]
  faculties: Faculty[]
  /** Keys of the units nobody signs for, marked Unassigned (#121). */
  unassigned?: Set<string>
}) {
  const write = useReferenceWrite()
  const [refusal, setRefusal] = useState<Refusal | null>(null)

  // Built from the spec alone, so a refetch doesn't remount an open edit.
  const columns = useMemo(() => referenceColumns(spec), [spec])
  const filters = useMemo<DataTableFilter<ReferenceLine>[]>(
    () =>
      spec.fields
        .filter((f) => spec.filterBy?.includes(f.field))
        .map((f) => ({ id: f.field, label: f.label, value: (line) => line.shown[f.field] || '—' })),
    [spec],
  )

  const lines = useMemo(
    () =>
      rows.map((row): ReferenceLine => {
        const key = text(row[spec.key.field])
        const shown = Object.fromEntries(
          spec.fields.map((f) => [
            f.field,
            f.kind === 'faculty'
              ? text(row.faculty) ||
                (faculties.find((x) => x.code === row[f.field])?.name ?? text(row[f.field]))
              : text(row[f.field]),
          ]),
        )
        return {
          row,
          key,
          shown,
          unassigned: unassigned?.has(key) ?? false,
          search: [key, ...Object.values(shown)].join(' '),
          faculties,
        }
      }),
    [rows, spec, faculties, unassigned],
  )

  const long = rows.length > FILTER_FROM_ROWS

  return (
    <DataTable
      columns={columns}
      rows={lines}
      getRowId={(line) => line.key}
      sortable
      searchable={long}
      filters={long ? filters : undefined}
      actions={
        <AddRowDialog
          title={`Add ${spec.noun === 'activity' ? 'an' : 'a'} ${spec.noun}`}
          fields={[spec.key, ...spec.fields]}
          options={facultyOptions(faculties)}
          ready={(entered) => String(entered[spec.key.field]).trim() !== ''}
          pending={write.isPending}
          refusal={refusal}
          onOpenChange={() => setRefusal(null)}
          onAdd={(entered, done) =>
            write.mutate(
              {
                op: 'create',
                table: spec.id,
                values: Object.fromEntries(
                  Object.entries(entered).map(([field, value]) => [field, String(value).trim()]),
                ),
              },
              {
                onSuccess: () => {
                  toast.success(`${spec.noun[0].toUpperCase()}${spec.noun.slice(1)} added`, {
                    description: String(entered[spec.key.field]),
                  })
                  done()
                },
                onError: (error) => setRefusal(refusalOf(error)),
              },
            )
          }
        />
      }
    />
  )
}
