import { Button } from "@/components/ui/button"
import {
  Actions, BackButton, NextButton, PageHead, Panel, PartBar,
} from "@/components/shell"
import {
  CellChoice, CellNumber, CellTd, CellText, Grid, Ledger, LedgerRow, Td, Th,
} from "@/components/DataTable"
import { money } from "@/lib/format"
import { useProject } from "@/state/project"
import { accountString, COST_GROUPS, DELIVERABLE_TYPES, MONTHS } from "@/lib/rcpt-engine"

const DELIVERABLE_OPTIONS = DELIVERABLE_TYPES.map((d) => ({
  value: d.code,
  label: `${d.code} — ${d.label}`,
}))

export function BudgetForm({
  onBack, onNext, nextLabel,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
}) {
  const { project, summary, years } = useProject()
  const or = (v: string) => (v.trim() ? v : "—")

  const totalSalaries = Object.values(summary.staffByBucket).reduce((a, b) => a + b, 0)

  return (
    <>
      <PageHead
        title="Budget Form"
        subtitle="Read-only summary for departmental and faculty approval"
        right={
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            Export PDF
          </Button>
        }
      />

      <Panel>
        <PartBar>PART A — Project Details</PartBar>
        <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          <KeyValues
            rows={[
              ["Project Title", or(project.title)],
              ["External Party", or(project.funder === "Other" ? project.otherFunder : project.funder)],
              ["Lead UoM Chief Investigator", or(project.ci)],
              ["Department", or(project.dept)],
            ]}
          />
          <KeyValues
            rows={[
              ["Project Duration",
                `${MONTHS[project.startMonth - 1]} ${years[0]} — ${MONTHS[project.endMonth - 1]} ${years[years.length - 1]}`],
              ["Budget Currency", "AUD - Australian Dollar"],
              ["Project Attributes",
                accountString(project.dept, project.activity, project.region) || "—"],
              ["Total Contract Value (Excl. GST)", money(summary.price)],
            ]}
          />
        </div>

        <PartBar>PART B — Price Summary</PartBar>
        <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          <Ledger>
            <tbody>
              <LedgerRow label="Price Excluding GST" value={money(summary.price)} />
              <LedgerRow
                label={
                  <>
                    GST <span className="ml-3 text-muted-foreground">{summary.gstApplies ? "Yes" : "No"}</span>
                  </>
                }
                value={money(summary.gst)}
              />
              <LedgerRow tone="rule" label="Total Price" value={money(summary.price + summary.gst)} />
            </tbody>
          </Ledger>
          <Ledger>
            <tbody>
              <LedgerRow label="Full Project Cost (excluding in-kind)" value={money(summary.projectCostFull)} />
              <LedgerRow label="Cash benefit/cost" value={money(summary.cashBenefit)} />
              <LedgerRow label="Total In-kind (University investment)" value={money(summary.inKindTotalFull)} />
              <LedgerRow
                tone="rule"
                label="University Position"
                value={
                  <span className={summary.universityPosition < 0 ? "text-bad" : "text-good"}>
                    {money(summary.universityPosition)}
                  </span>
                }
              />
            </tbody>
          </Ledger>
        </div>

        <PartBar>Part E — Staff Budget</PartBar>
        <Ledger>
          <tbody>
            {Object.entries(summary.staffByBucket).map(([label, value]) => (
              <LedgerRow key={label} label={label} value={money(value)} />
            ))}
            <LedgerRow tone="rule" label="Total Salaries and On-Costs" value={money(totalSalaries)} />
            <LedgerRow label="Cost Recovery (Salaries) (723B)" value={money(summary.staffPrice - totalSalaries)} />
            <LedgerRow label="Cost Recovery (Salaries) Multiplier" value={summary.multiplier.toFixed(2)} />
            <LedgerRow tone="rule" label="Total Staff Costs" value={money(summary.staffPrice)} />
          </tbody>
        </Ledger>

        <PartBar>Part F — Non-Staff Budget</PartBar>
        <Ledger>
          <tbody>
            {COST_GROUPS.map((group) => (
              <LedgerRow key={group} label={group} value={money(summary.nonStaffByGroup[group] ?? 0)} />
            ))}
            <LedgerRow tone="rule" label="Total Non-Staff Costs" value={money(summary.nonStaff)} />
          </tbody>
        </Ledger>

        <PartBar info="Must be completed for Grants. Record all technical and financial deliverables and invoicing dates.">
          PART J — Deliverables{" "}
          <span className="font-normal text-muted-foreground">optional for contracts</span>
        </PartBar>
        <Grid>
          <thead>
            <tr>
              <Th className="w-11" align="center">No.</Th>
              <Th>Description</Th>
              <Th>Type</Th>
              <Th align="right">Invoice Amount</Th>
              <Th>Due Date</Th>
              <Th>Dependency Sponsor</Th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((n) => (
              <tr key={n}>
                <Td align="center" className="text-muted-foreground">{n}</Td>
                <CellTd><CellText className="min-w-[220px]" /></CellTd>
                <CellTd><CellChoice value="" options={DELIVERABLE_OPTIONS} onChange={() => {}} /></CellTd>
                <CellTd><CellNumber prefix="$" className="min-w-[96px]" value={0} onChange={() => {}} /></CellTd>
                <CellTd><CellText className="min-w-[110px]" placeholder="dd/mm/yyyy" /></CellTd>
                <CellTd><CellText className="min-w-[150px]" /></CellTd>
              </tr>
            ))}
          </tbody>
        </Grid>
      </Panel>

      <Actions>
        <BackButton onClick={onBack} />
        <NextButton onClick={onNext}>{nextLabel}</NextButton>
      </Actions>
    </>
  )
}

function KeyValues({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-muted-foreground">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  )
}
