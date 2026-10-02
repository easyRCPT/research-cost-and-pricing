import { CellText, Grid, Money, Td, Th } from '@/components/shell'
import { Checkbox } from '@/components/ui/checkbox'
import { money } from '@/lib/format/utils'

export interface CostRow {
  key: string
  /** Staff costs come from the engine; non-staff costs are sums of what was typed. */
  kind: 'staff' | 'non-staff'
  label: string
  detail: string
  cost: number
  inKind: boolean
  toggle: (value: boolean) => void
  /** Why the University absorbs it. Only a ticked line may carry one. */
  reason: string
  setReason: (value: string) => void
}

export function InKindFlagsTable({ rows }: { rows: CostRow[] }) {
  return (
    <Grid>
      <thead>
        <tr>
          <Th>Cost line</Th>
          <Th>Detail</Th>
          <Th align="right" className="w-36">
            Cost (AUD)
          </Th>
          <Th align="center" className="w-24">
            In kind?
          </Th>
          <Th>Reason the University absorbs it</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <Td>{row.label}</Td>
            <Td className="text-muted-foreground">{row.detail}</Td>
            <Td align="right" className="tabular">
              {row.kind === 'staff' ? (
                <Money value={row.cost} />
              ) : (
                money(row.cost)
              )}
            </Td>
            <Td align="center">
              <Checkbox
                className="mx-auto"
                checked={row.inKind}
                onCheckedChange={(checked) => row.toggle(checked === true)}
              />
            </Td>
            <Td>
              <ReasonCell row={row} />
            </Td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <Td colSpan={5} className="py-6 text-center text-muted-foreground">
              Nothing costed yet. Add staff or non-staff costs first.
            </Td>
          </tr>
        )}
      </tbody>
    </Grid>
  )
}

/**
 * The reason, once there is a tick to hang it on.
 *
 * Unticked it says so rather than rendering a disabled box: the server refuses
 * a reason without a tick, and an input that looks fillable but is not is how
 * someone types a sentence and loses it.
 *
 * CellText rather than a plain input, so this settles like every other text
 * cell in the editor instead of recosting the budget on each keystroke.
 */
function ReasonCell({ row }: { row: CostRow }) {
  if (!row.inKind) {
    return <span className="text-muted-foreground">Tick the box to say why</span>
  }

  return (
    <CellText
      value={row.reason}
      onChange={row.setReason}
      maxLength={200}
      placeholder="Why the University absorbs it"
      aria-label={`Reason the University absorbs ${row.label}`}
    />
  )
}
