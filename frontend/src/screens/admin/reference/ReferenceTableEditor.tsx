import { Grid, Panel, Th } from '@/components/shell'
import { AddReferenceRow } from '@/screens/admin/reference/AddReferenceRow'
import { ReferenceRow } from '@/screens/admin/reference/ReferenceRow'
import {
  PIN_LEFT,
  PIN_RIGHT,
  text,
  type Faculty,
  type Row,
} from '@/screens/admin/reference/shared'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

/**
 * A reference table (#70, #144): rows that don't price a costing, saved one
 * at a time and changed in place. No set and no rates version: the panel says
 * so, so nobody waits for one. A key (a code, a ledger ID) is what other
 * records point at, so it is entered once and never edited.
 */
export function ReferenceTableEditor({
  spec,
  rows,
  faculties,
  flags,
}: {
  spec: ReferenceTableSpec
  rows: Row[]
  faculties: Faculty[]
  /** Rows to mark, by key, with what to say: "No head of department" (#121). */
  flags?: { keys: Set<string>; label: string }
}) {
  return (
    <Panel
      title={spec.label}
      description="A reference table: each row is saved on its own and changed in place. It doesn't price a costing, so no rates version is made."
    >
      <Grid>
        <thead>
          <tr>
            <Th className={PIN_LEFT}>{spec.key.label}</Th>
            {spec.fields.map((f) => (
              <Th key={f.field}>{f.label}</Th>
            ))}
            <Th className={PIN_RIGHT} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ReferenceRow
              key={text(row[spec.key.field])}
              spec={spec}
              row={row}
              faculties={faculties}
              flag={
                flags?.keys.has(text(row[spec.key.field]))
                  ? flags.label
                  : undefined
              }
            />
          ))}
        </tbody>
      </Grid>
      <AddReferenceRow key={spec.id} spec={spec} faculties={faculties} />
    </Panel>
  )
}
