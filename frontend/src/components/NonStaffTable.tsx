import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Calc, CellChoice, CellNumber, CellTd, CellText, FootTd, Grid, Td, Th,
} from "@/components/DataTable"
import { useYearHeadings } from "@/components/StaffTable"
import { money } from "@/lib/format"
import { useProject } from "@/state/project"
import { COST_GROUPS, expensesFor, NO_TEN_PERCENT, nonStaffLine, setYearValue } from "@/lib/rcpt-engine"

export function NonStaffTable({ showInKind = false }: { showInKind?: boolean }) {
  const { project, years, patchNonStaff, removeNonStaff, addNonStaff } = useProject()
  const headings = useYearHeadings()
  const rows = project.nonStaff

  const perYear = years.map((_, i) => rows.reduce((s, r) => s + (r.amounts[i] || 0), 0))
  const total = rows.reduce((s, r) => s + nonStaffLine(r).total, 0)
  const columnCount = 4 + years.length + (showInKind ? 1 : 0) + 1

  return (
    <>
      <Grid wide>
        <thead>
          <tr>
            <Th>Cost group</Th>
            <Th>Expense type</Th>
            <Th>Description</Th>
            {headings.map((h) => (
              <Th key={h.year} align="right" className="text-navy">
                {h.label}
              </Th>
            ))}
            <Th align="right">Total (AUD)</Th>
            {showInKind && <Th align="center">In Kind?</Th>}
            <Th align="center">
              Additional 10%
              <span className="block font-normal text-muted-foreground">added to direct cost*</span>
            </Th>
            <Th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const line = nonStaffLine(row)
            const tenAllowed = Boolean(row.group) && !NO_TEN_PERCENT.has(row.group)
            return (
              <tr key={row.id}>
                <CellTd>
                  <CellChoice
                    value={row.group}
                    options={COST_GROUPS}
                    onChange={(v) => patchNonStaff(row.id, { group: v, expense: "" })}
                  />
                </CellTd>
                <CellTd>
                  <CellChoice
                    placeholder={row.group ? "Select…" : "—"}
                    disabled={!row.group}
                    value={row.expense}
                    options={expensesFor(row.group)}
                    onChange={(v) => patchNonStaff(row.id, { expense: v })}
                  />
                </CellTd>
                <CellTd>
                  <CellText
                    className="min-w-[200px] max-w-[380px]"
                    value={row.desc}
                    onChange={(e) => patchNonStaff(row.id, { desc: e.target.value })}
                  />
                </CellTd>
                {years.map((_, i) => (
                  <CellTd key={i}>
                    <CellNumber
                      min={0}
                      prefix="$"
                      className="min-w-[76px] max-w-[130px]"
                      value={row.amounts[i] ?? 0}
                      clamp={(v) => Math.max(0, v)}
                      onChange={(v) => patchNonStaff(row.id, {
                        amounts: setYearValue(row.amounts, i, v, years.length),
                      })}
                    />
                  </CellTd>
                ))}
                <Calc className={line.total ? "text-foreground" : "text-muted-foreground"}>
                  {line.total ? money(line.total) : "—"}
                </Calc>
                {showInKind && (
                  <Td align="center">
                    <Checkbox
                      className="mx-auto"
                      checked={row.inKind}
                      onCheckedChange={(v) => patchNonStaff(row.id, { inKind: v === true })}
                    />
                  </Td>
                )}
                <Td align="center">
                  <Checkbox
                    className="mx-auto"
                    checked={row.addTenPercent}
                    disabled={!tenAllowed}
                    onCheckedChange={(v) => patchNonStaff(row.id, { addTenPercent: v === true })}
                  />
                </Td>
                <Td align="center">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove row"
                    className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
                    onClick={() => removeNonStaff(row.id)}
                  >
                    <X />
                  </Button>
                </Td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <Td colSpan={columnCount} className="py-6 text-center text-muted-foreground">
                No rows yet.
              </Td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <FootTd colSpan={3} className="text-left">
              Total
            </FootTd>
            {perYear.map((v, i) => (
              <FootTd key={i}>{money(v)}</FootTd>
            ))}
            <FootTd>{money(total)}</FootTd>
            <FootTd colSpan={showInKind ? 3 : 2} />
          </tr>
        </tfoot>
      </Grid>
      <Button variant="outline" size="sm" className="mt-3" onClick={addNonStaff}>
        <Plus /> Add row
      </Button>
    </>
  )
}
