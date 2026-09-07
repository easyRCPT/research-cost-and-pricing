import { Grid, Td, Th } from '@/components/shell'
import { Checkbox } from '@/components/ui/checkbox'
import { money } from '@/lib/format/utils'

export interface CostRow {
  key: string
  label: string
  detail: string
  cost: number
  inKind: boolean
  toggle: (value: boolean) => void
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
              {money(row.cost)}
            </Td>
            <Td align="center">
              <Checkbox
                className="mx-auto"
                checked={row.inKind}
                onCheckedChange={(checked) => row.toggle(checked === true)}
              />
            </Td>
            <Td className="text-muted-foreground">—</Td>
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
