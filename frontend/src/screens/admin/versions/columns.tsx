import type { LookupVersion } from '@/api/admin-lookups'
import { columnHelper } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dateTime } from '@/lib/format/dates'

import { CountLink } from './CountLink'
import type { VersionTab } from './types'

const col = columnHelper<LookupVersion>()

const changesIn = (version: LookupVersion) =>
  version.change_sets.reduce((sum, set) => sum + set.change_count, 0)

interface VersionColumnsProps {
  open: (id: number, tab: VersionTab) => void
  restore: (version: LookupVersion) => void
}

export function versionColumns({ open, restore }: VersionColumnsProps) {
  return col.columns([
    col.accessor('id', {
      header: 'Version',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          #{row.original.id}{' '}
          {row.original.current && <Badge variant="secondary">Current</Badge>}{' '}
          {row.original.baseline && (
            <Badge
              variant="outline"
              title="The rates as first loaded, kept so they can always be restored"
            >
              As first loaded
            </Badge>
          )}
        </span>
      ),
    }),
    col.accessor('created_at', {
      header: 'Made',
      cell: ({ getValue }) => dateTime(getValue()),
      meta: { className: 'whitespace-nowrap' },
    }),
    col.accessor((version) => version.updated_by_name ?? '', {
      id: 'updated_by',
      header: 'By',
      cell: ({ row }) => row.original.updated_by_name ?? '—',
    }),
    col.accessor(changesIn, {
      id: 'changes',
      header: 'Changes saved into it',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <CountLink
          count={changesIn(row.original)}
          label={`Show changes saved into version #${row.original.id}`}
          onClick={() => open(row.original.id, 'changes')}
        />
      ),
    }),
    col.accessor('budgets_priced', {
      header: 'Costings priced on it',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <CountLink
          count={row.original.budgets_priced}
          label={`Show costings priced on version #${row.original.id}`}
          onClick={() => open(row.original.id, 'costings')}
        />
      ),
    }),
    col.display({
      id: 'restore',
      header: () => <span className="sr-only">Restore</span>,
      cell: ({ row }) =>
        row.original.current ? (
          // Holds the row to the height the other rows get from their button.
          <span className="block h-7" aria-hidden />
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => restore(row.original)}
          >
            Restore
          </Button>
        ),
      meta: { className: 'w-0' },
    }),
  ])
}
