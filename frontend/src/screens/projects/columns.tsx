import { columnHelper, type DataTableColumns } from '@/components/data-table'
import { shortDate } from '@/lib/format/dates'
import { money } from '@/lib/format/utils'
import { statusLabel } from '@/lib/status'
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

export const ownerName = (row: Pick<ProjectListRow, 'owner'>) =>
  row.owner.name || row.owner.email

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
    // Bounded and wrapping: the table sizes to its content, and the owner
    // column pushes long titles off the side of the page otherwise.
    cell: ({ row }) => (
      <div className="max-w-[320px] py-0.5 whitespace-normal">
        {openable(row.original) ? (
          <button
            type="button"
            onClick={() => open(row.original)}
            className="cursor-pointer text-left font-medium hover:underline"
          >
            {row.original.title || 'Untitled'}
          </button>
        ) : (
          <div className="font-medium">{row.original.title || 'Untitled'}</div>
        )}
        <div className="text-muted-foreground">{row.original.department}</div>
      </div>
    ),
  })

export const ownerColumn = <T extends ProjectListRow>(header: string) =>
  col<T>().accessor(ownerName, {
    id: 'owner',
    header,
    cell: ({ row }) => (
      <div className="py-0.5">
        <div>{ownerName(row.original)}</div>
        {row.original.owner.name && (
          <div className="text-muted-foreground">
            {row.original.owner.email}
          </div>
        )}
      </div>
    ),
    meta: { className: 'w-[220px]' },
  })

export const statusColumn = <T extends ProjectListRow>() =>
  col<T>().accessor((row) => statusLabel(row.status), {
    id: 'status',
    header: 'Status',
    // A project can carry several budgets. This is the most recently touched
    // one, which is the only one a single column can honestly report.
    cell: ({ row }) => (
      <span
        className={
          row.original.status === null
            ? 'text-muted-foreground'
            : 'text-primary'
        }
      >
        {statusLabel(row.original.status)}
        {row.original.budget_count > 1 && (
          <span className="text-muted-foreground">
            {' '}
            · {row.original.budget_count} budgets
          </span>
        )}
      </span>
    ),
    meta: { className: 'w-[220px]' },
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
    cell: ({ row }) => shortDate(row.original.updated_at),
    meta: {
      align: 'right',
      className: 'w-[140px] whitespace-nowrap text-muted-foreground',
    },
  })

/** Built per screen because opening a row is the screen's to handle. */
export const projectColumns = (
  onOpen: (budgetId: number) => void,
): DataTableColumns<ProjectRow> =>
  columnHelper<ProjectRow>().columns([
    referenceColumn<ProjectRow>(),
    titleColumn<ProjectRow>(
      (row) => row.budget_id !== null && onOpen(row.budget_id),
      (row) => row.budget_id !== null,
    ),
    statusColumn<ProjectRow>(),
    priceColumn<ProjectRow>(),
    updatedColumn<ProjectRow>(),
  ])
