import { columnHelper, type DataTableColumns } from '@/components/data-table'
import { money } from '@/lib/format/utils'
import type { ProjectRow } from '@/types'
import { STATUS_LABELS } from './status'

const dateFormat = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const col = columnHelper<ProjectRow>()

/** Built per screen because opening a row is the screen's to handle. */
export const projectColumns = (
  onOpen: (budgetId: number) => void,
): DataTableColumns<ProjectRow> =>
  col.columns([
    col.accessor('reference', {
      header: 'Reference',
      meta: {
        className: 'w-[150px] whitespace-nowrap font-medium text-primary',
      },
    }),
    col.accessor('title', {
      header: 'Title',
      cell: ({ row }) => {
        const { title, department, budget_id } = row.original
        return (
          <div className="py-0.5">
            {budget_id === null ? (
              <div className="font-medium">{title}</div>
            ) : (
              <button
                type="button"
                onClick={() => onOpen(budget_id)}
                className="cursor-pointer text-left font-medium hover:underline"
              >
                {title}
              </button>
            )}
            <div className="text-muted-foreground">{department}</div>
          </div>
        )
      },
    }),
    col.accessor('status', {
      header: 'Status',
      // A project can carry several budgets. This is the most recently touched
      // one, which is the only one a single column can honestly report.
      cell: ({ row }) => {
        const { status, budget_count } = row.original
        if (status === null)
          return <span className="text-muted-foreground">No budget</span>
        return (
          <span className="text-primary">
            {STATUS_LABELS[status]}
            {budget_count > 1 && (
              <span className="text-muted-foreground">
                {' '}
                · {budget_count} budgets
              </span>
            )}
          </span>
        )
      },
      meta: { className: 'w-[220px]' },
    }),
    col.accessor('total_price_inc_gst', {
      header: 'Total price (exc. GST)',
      meta: {
        align: 'right',
        className: 'w-[180px] whitespace-nowrap tabular',
      },
      cell: ({ row }) =>
        row.original.budget_id === null
          ? '—'
          : money(row.original.total_price_inc_gst),
    }),
    col.accessor('updated_at', {
      header: 'Last updated',
      meta: {
        align: 'right',
        className: 'w-[140px] whitespace-nowrap text-muted-foreground',
      },
      cell: ({ row }) => dateFormat.format(new Date(row.original.updated_at)),
    }),
  ])
