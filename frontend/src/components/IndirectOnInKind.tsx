import { Calc, Grid, Td, Th } from "@/components/DataTable"
import { useYearHeadings } from "@/components/StaffTable"
import { money } from "@/lib/format"
import { useProject } from "@/state/project"
import { staffLine } from "@/lib/rcpt-engine"

/** Cost recovery earned on in-kind staff time, for projects where recovery — but not salary — can be charged. */
export function IndirectOnInKind() {
  const { project, years, summary } = useProject()
  const headings = useYearHeadings()
  const absorbed = project.staff.filter((r) => r.inKind)

  const perYear = years.map((_, i) =>
    absorbed.reduce(
      (sum, row) =>
        sum + staffLine(row, project, summary.inKindMultiplier).byYear[i].salaryPlusOncosts *
          Math.max(0, summary.inKindMultiplier - 1),
      0,
    ),
  )
  const total = perYear.reduce((a, b) => a + b, 0)

  return (
    <Grid>
      <thead>
        <tr>
          <Th />
          {headings.map((h) => (
            <Th key={h.year} align="right" className="w-[150px]">{h.label}</Th>
          ))}
          <Th align="right" className="w-[150px]">Total (AUD)</Th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <Td>Cost Recovery on In-kind contributions (University investment)</Td>
          {perYear.map((v, i) => (
            <Calc key={i} className={v ? "text-foreground" : "text-muted-foreground"}>
              {v ? money(v) : "—"}
            </Calc>
          ))}
          <Calc className={total ? "text-foreground" : "text-muted-foreground"}>
            {total ? money(total) : "—"}
          </Calc>
        </tr>
      </tbody>
    </Grid>
  )
}
