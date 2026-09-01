import { Fragment } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Calc, CellChoice, CellNumber, CellTd, CellText, FootTd, Grid, Td, Th,
} from "@/components/DataTable"
import { money, money2 } from "@/lib/format"
import { useProject } from "@/state/project"
import {
  CATEGORIES, EMPLOYMENT_TYPES, basesFor, classificationsFor, maxTimeFor, setYearValue,
  staffLine, tableRate, type StaffRow,
} from "@/lib/rcpt-engine"

/** Time is never negative, and FTE never exceeds one full-time person. */
const clampTime = (value: number, basis: string) => {
  if (!Number.isFinite(value) || value < 0) return 0
  const max = maxTimeFor(basis)
  return max === undefined ? value : Math.min(value, max)
}

export function useYearHeadings() {
  const { years } = useProject()
  return years.map((year, i) => ({ year, label: `Year ${i + 1} (${year})` }))
}

export function StaffTable({
  rows, multiplier, addLabel = "Add row", inKind = false,
}: {
  rows: StaffRow[]
  multiplier: number
  addLabel?: string
  /** Rows added from this table are flagged as in-kind. */
  inKind?: boolean
}) {
  const { project, years, patchStaff, removeStaff, addStaff } = useProject()
  const headings = useYearHeadings()

  const lines = rows.map((r) => staffLine(r, project, multiplier))
  const perYear = years.map((_, i) => lines.reduce((s, l) => s + l.byYear[i].total, 0))

  return (
    <>
      <Grid wide>
        <thead>
          <tr>
            <Th rowSpan={2}>Name / Role</Th>
            <Th rowSpan={2}>Employment Type</Th>
            <Th rowSpan={2}>Category</Th>
            <Th rowSpan={2}>Classification</Th>
            <Th rowSpan={2}>FTE / Daily / Hourly</Th>
            <Th rowSpan={2} align="right">Rate (AUD)</Th>
            {headings.map((h) => (
              <Th key={h.year} colSpan={2} align="center" className="text-navy">
                {h.label}
              </Th>
            ))}
            <Th rowSpan={2} className="w-8" />
          </tr>
          <tr>
            {headings.map((h) => (
              <Fragment key={h.year}>
                <Th align="right">Time</Th>
                <Th align="right">Total (AUD)</Th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const line = lines[index]
            const rate = tableRate(row)
            return (
              <tr key={row.id} className="last:[&>td]:border-b-0">
                <CellTd>
                  <CellText
                    className="min-w-[170px] max-w-[340px]"
                    value={row.name}
                    onChange={(e) => patchStaff(row.id, { name: e.target.value })}
                  />
                </CellTd>
                <CellTd>
                  <CellChoice
                    value={row.employment}
                    options={EMPLOYMENT_TYPES}
                    onChange={(v) => {
                      // Casual has only one basis, so pick it rather than making them.
                      const options = basesFor(v)
                      const basis = options.length === 1 ? options[0]
                        : options.includes(row.basis) ? row.basis : ""
                      patchStaff(row.id, { employment: v, basis })
                    }}
                  />
                </CellTd>
                <CellTd>
                  <CellChoice
                    value={row.category}
                    options={CATEGORIES}
                    onChange={(v) => patchStaff(row.id, { category: v, classification: "" })}
                  />
                </CellTd>
                <CellTd>
                  <CellChoice
                    placeholder={row.category ? "Select…" : "—"}
                    disabled={!row.category}
                    value={row.classification}
                    options={classificationsFor(row.category)}
                    onChange={(v) => patchStaff(row.id, { classification: v })}
                  />
                </CellTd>
                <CellTd>
                  <CellChoice
                    placeholder={row.employment ? "Select…" : "—"}
                    disabled={!row.employment}
                    value={row.basis}
                    options={basesFor(row.employment)}
                    onChange={(v) => patchStaff(row.id, { basis: v })}
                  />
                </CellTd>
                <Calc className={rate ? "text-foreground" : "text-muted-foreground"}>
                  {rate ? money2(rate) : "—"}
                </Calc>
                {years.map((_, i) => (
                  <Fragment key={i}>
                    <CellTd>
                      <CellNumber
                        min={0}
                        max={maxTimeFor(row.basis)}
                        step={row.basis === "FTE" ? 0.05 : 1}
                        // Time means nothing until we know what it is measured in.
                        disabled={!row.basis}
                        className="min-w-[52px] max-w-[90px]"
                        value={row.time[i] ?? 0}
                        clamp={(v) => clampTime(v, row.basis)}
                        onChange={(v) => patchStaff(row.id, {
                          time: setYearValue(row.time, i, v, years.length),
                        })}
                      />
                    </CellTd>
                    <Calc className={line.byYear[i].total ? "text-foreground" : "text-muted-foreground"}>
                      {line.byYear[i].total ? money(line.byYear[i].total) : "—"}
                    </Calc>
                  </Fragment>
                ))}
                <Td align="center">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove row"
                    className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
                    onClick={() => removeStaff(row.id)}
                  >
                    <X />
                  </Button>
                </Td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <Td colSpan={7 + years.length * 2} className="py-6 text-center text-muted-foreground">
                No rows yet.
              </Td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <FootTd colSpan={6} className="text-left">
              Total
            </FootTd>
            {perYear.map((v, i) => (
              <Fragment key={i}>
                <FootTd />
                <FootTd>{money(v)}</FootTd>
              </Fragment>
            ))}
            <FootTd />
          </tr>
        </tfoot>
      </Grid>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => addStaff(inKind)}>
        <Plus /> {addLabel}
      </Button>
    </>
  )
}
