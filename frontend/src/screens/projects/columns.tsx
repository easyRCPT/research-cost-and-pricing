import { columnHelper, type DataTableColumns } from '@/components/data-table'
import { StatusChip } from '@/components/shell'
import { dateTime } from '@/lib/format/dates'
import { money } from '@/lib/format/utils'
import { ownerName, statusLabel } from '@/lib/status'
import type { ProjectRow } from '@/types'

/** What the shared columns read: a ProjectRow, or an AdminProject. */
export type ProjectListRow = Pick<
  ProjectRow,
  | 'title'
  | 'department'
  | 'status'
  | 'budget_count'
  | 'budget_id'
  | 'total_price_inc_gst'
  | 'updated_at'
  | 'owner'
> & { reference: string | null }

const col = <T extends ProjectListRow>() => columnHelper<T>()

export const referenceColumn = <T extends ProjectListRow>() =>
  col<T>().accessor((row) => row.reference, {
    id: 'reference',
    header: 'Reference',
    meta: {
      className: 'w-[150px] whitespace-nowrap font-medium text-primary',
    },
  })

/** Opens the row when `openable` allows, else shows a plain title. */
export const titleColumn = <T extends ProjectListRow>(
  open: (row: T) => void,
  openable: (row: T) => boolean = () => true,
) =>
  col<T>().accessor((row) => row.title, {
    id: 'title',
    header: 'Title',
    enableHiding: false,
    cell: ({ row }) => {
      const title = row.original.title || 'Untitled'
      return openable(row.original) ? (
        <button
          type="button"
          title={title}
          onClick={() => open(row.original)}
          className="block max-w-[320px] cursor-pointer truncate text-left font-medium hover:underline"
        >
          {title}
        </button>
      ) : (
        <div title={title} className="max-w-[320px] truncate font-medium">
          {title}
        </div>
      )
    },
    // Truncated: the table sizes to its content, and a long title pushes the
    // other columns off the side of the page otherwise.
    meta: { className: 'whitespace-nowrap' },
  })

export const departmentColumn = <T extends ProjectListRow>() =>
  col<T>().accessor((row) => row.department, {
    id: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <div title={row.original.department} className="max-w-[260px] truncate">
        {row.original.department}
      </div>
    ),
    meta: { className: 'whitespace-nowrap text-muted-foreground' },
  })

export const ownerColumn = <T extends ProjectListRow>(header: string) =>
  col<T>().accessor(ownerName, {
    id: 'owner',
    header,
    cell: ({ row }) => (
      <span title={row.original.owner.email}>{ownerName(row.original)}</span>
    ),
    meta: { className: 'whitespace-nowrap' },
  })

export const statusColumn = <T extends ProjectListRow>() =>
  col<T>().accessor((row) => statusLabel(row.status), {
    id: 'status',
    header: 'Status',
    // A project can carry several budgets. This is the most recently touched
    // one, which is the only one a single column can honestly report.
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <StatusChip status={row.original.status} />
        {row.original.budget_count > 1 && (
          <span className="text-muted-foreground">
            · {row.original.budget_count} budgets
          </span>
        )}
      </span>
    ),
    meta: { className: 'whitespace-nowrap' },
  })

export const priceColumn = <T extends ProjectListRow>() =>
  col<T>().accessor((row) => row.total_price_inc_gst, {
    id: 'total_price_inc_gst',
    header: 'Total price (inc. GST)',
    cell: ({ row }) =>
      row.original.budget_id === null
        ? '—'
        : money(row.original.total_price_inc_gst),
    meta: {
      align: 'right',
      className: 'w-[180px] whitespace-nowrap tabular',
    },
  })

export const updatedColumn = <T extends ProjectListRow>() =>
  col<T>().accessor((row) => row.updated_at, {
    id: 'updated_at',
    header: 'Last updated',
    cell: ({ row }) => dateTime(row.original.updated_at),
    meta: {
      align: 'right',
      className: 'whitespace-nowrap text-muted-foreground',
    },
  })

/**
 * The register columns. `ownerHeader` adds the owner column under that
 * heading, and `openable` limits which rows link to their costing.
 */
export const projectColumns = <T extends ProjectListRow>({
  open,
  openable,
  ownerHeader,
}: {
  open: (row: T) => void
  openable?: (row: T) => boolean
  ownerHeader?: string
}): DataTableColumns<T> =>
  columnHelper<T>().columns([
    referenceColumn<T>(),
    titleColumn<T>(open, openable),
    departmentColumn<T>(),
    ...(ownerHeader ? [ownerColumn<T>(ownerHeader)] : []),
    statusColumn<T>(),
    priceColumn<T>(),
    updatedColumn<T>(),
  ])
