import type { QueueRow } from '@/api/approvals'
import { shortDate } from '@/lib/format/dates'
import { money } from '@/lib/format/utils'

export function DecisionSummary({ budget }: { budget: QueueRow['budget'] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-[13.5px]">
      <dt className="text-muted-foreground">Submitted by</dt>
      <dd>
        {budget.submitted_by}, {shortDate(budget.submitted_at)}
      </dd>
      <dt className="text-muted-foreground">Unit</dt>
      <dd>
        {budget.department} · {budget.faculty}
      </dd>
      <dt className="text-muted-foreground">Chief investigator</dt>
      <dd>{budget.chief_investigator || '—'}</dd>
      <dt className="text-muted-foreground">Price including GST</dt>
      <dd className="tabular font-semibold">
        {money(budget.total_price_inc_gst)}
      </dd>
      <dt className="text-muted-foreground">Margin</dt>
      <dd className="tabular">{(budget.margin * 100).toFixed(1)}%</dd>
    </dl>
  )
}
