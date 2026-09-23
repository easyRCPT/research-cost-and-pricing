import { Ledger, LedgerRow, PartBar } from '@/components/shell'
import { money } from '@/lib/format/utils'
import type { BudgetDetail } from '@/types'

interface InKindSectionProps {
  budget: BudgetDetail
}

/**
 * What the University absorbed, and why (#92).
 *
 * The rest of the form is ledger totals, and in-kind appeared only as one of
 * them. An in-kind line is University money spent on a project without being
 * charged to the funder, so the person signing the form is entitled to see
 * which costs those were and on whose reasoning, not just what they came to.
 *
 * A line with no reason still shows: the sentence is not required, and hiding
 * the row would hide the contribution along with it.
 */
export function InKindSection({ budget }: InKindSectionProps) {
  const rows = [
    ...budget.staff_in_kind_cost.lines.map((line) => ({
      key: `staff-${line.id}`,
      label: line.name_role || '(unnamed person)',
      reason: line.in_kind_reason,
      total: line.total,
    })),
    ...budget.non_staff_in_kind_cost.lines.map((line) => ({
      key: `non-staff-${line.id}`,
      label: line.description || line.cost_group || '(untitled cost)',
      reason: line.in_kind_reason,
      total: line.total,
    })),
  ]

  if (rows.length === 0) return null

  return (
    <>
      <PartBar>In-Kind Contributions</PartBar>
      <Ledger>
        <tbody>
          {rows.map((row) => (
            <LedgerRow
              key={row.key}
              label={
                <>
                  <span>{row.label}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {row.reason || 'No reason given'}
                  </span>
                </>
              }
              value={money(row.total)}
            />
          ))}
          <LedgerRow
            tone="rule"
            label="Total In-Kind Contributions"
            value={money(
              budget.budget_summary.price_summary.total_in_kind_contribution,
            )}
          />
        </tbody>
      </Ledger>
    </>
  )
}
