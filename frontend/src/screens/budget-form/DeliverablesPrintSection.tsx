import { PartBar } from '@/components/shell'
import { useMoney } from '@/lib/format/currency'
import type { BudgetDetail } from '@/types'

export function DeliverablesPrintSection({ budget }: { budget: BudgetDetail }) {
  const money = useMoney()
  const rows = budget.budget_info.deliverables

  return (
    <>
      <PartBar description="Must be completed for Grants. Record all technical and financial deliverables and invoicing dates.">
        PART J — Deliverables{' '}
        <span className="font-normal text-muted-foreground">
          optional for contracts
        </span>
      </PartBar>
      {rows.length === 0 ? (
        <p className="py-2 text-[13px]">No deliverables recorded.</p>
      ) : (
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-1 text-center font-semibold">No.</th>
              <th className="px-2 py-1 font-semibold">Description</th>
              <th className="px-2 py-1 font-semibold">Type</th>
              <th className="px-2 py-1 text-right font-semibold">
                Invoice Amount
              </th>
              <th className="px-2 py-1 font-semibold">Due Date</th>
              <th className="px-2 py-1 text-center font-semibold">
                Dependency
              </th>
              <th className="px-2 py-1 font-semibold">Sponsor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-2 py-1 text-center">{row.number}</td>
                <td className="px-2 py-1">{row.description || '—'}</td>
                <td className="px-2 py-1">{row.deliverable_type || '—'}</td>
                <td className="tabular px-2 py-1 text-right">
                  {row.invoice_amount === null
                    ? '—'
                    : money(row.invoice_amount)}
                </td>
                <td className="px-2 py-1">{row.due_date || '—'}</td>
                <td className="px-2 py-1 text-center">
                  {row.dependency ?? '—'}
                </td>
                <td className="px-2 py-1">{row.sponsor || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
