import { Link } from '@tanstack/react-router'
import { useVersionBudgets } from '@/api/admin-lookups'
import { Skeleton } from '@/components/ui/skeleton'
import { shortDate } from '@/lib/format/dates'
import { money } from '@/lib/format/utils'
import { STATUS_LABELS } from '@/lib/status'

/** The costings stamped with one version, each opening the costing (#142). */
export function VersionBudgets({ versionId }: { versionId: number }) {
  const { data: budgets, isPending, isError } = useVersionBudgets(versionId)

  if (isPending)
    return (
      <Skeleton className="h-6" role="status" aria-label="Loading costings" />
    )
  if (isError)
    return (
      <p className="text-destructive">
        The costings on this version could not be loaded.
      </p>
    )

  return (
    <table
      className="w-full text-[13px]"
      aria-label={`Costings priced on version #${versionId}`}
    >
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-1 pr-3 font-medium">Reference</th>
          <th className="py-1 pr-3 font-medium">Title</th>
          <th className="py-1 pr-3 font-medium">Owner</th>
          <th className="py-1 pr-3 font-medium">Status</th>
          <th className="py-1 pr-3 text-right font-medium">Price (inc. GST)</th>
          <th className="py-1 font-medium">Submitted</th>
        </tr>
      </thead>
      <tbody>
        {budgets.map((budget) => (
          <tr key={budget.id} className="border-t">
            <td className="py-1 pr-3 whitespace-nowrap">
              {budget.reference ?? '—'}
            </td>
            <td className="py-1 pr-3">
              <Link
                to="/projects/$projectId/$screen"
                params={{ projectId: budget.project_id, screen: 'details' }}
                className="font-medium text-primary hover:underline"
              >
                {budget.title || 'Untitled'}
              </Link>
            </td>
            <td className="py-1 pr-3">
              {budget.owner.name || budget.owner.email}
            </td>
            <td className="py-1 pr-3">{STATUS_LABELS[budget.status]}</td>
            <td className="tabular py-1 pr-3 text-right">
              {money(budget.total_price_inc_gst)}
            </td>
            <td className="py-1 whitespace-nowrap">
              {budget.submitted_at ? shortDate(budget.submitted_at) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
