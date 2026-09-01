import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Actions, BackButton, Banner, NextButton, PageHead, Panel,
} from "@/components/shell"
import { Ledger, LedgerRow } from "@/components/DataTable"
import { RecoveryControl } from "@/components/RecoveryControl"
import { money, percent } from "@/lib/format"
import { useProject } from "@/state/project"
import { RECOVERY } from "@/lib/rcpt-engine"

export function PriceSummary({
  onBack, onNext, nextLabel,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
}) {
  const { project, summary, set } = useProject()

  return (
    <>
      <PageHead
        title="Price Summary"
        subtitle="Cost, price and the resulting University position"
        right={<RecoveryControl />}
      />

      <Panel
        collapsible
        title={
          <>
            Cayuse summary{" "}
            <Badge variant="secondary" className="ml-1 align-middle font-normal">read only</Badge>
          </>
        }
        info="Use these details to populate the Cayuse Proposal Form Financial Details section. Every figure here is derived from the costing — nothing is entered in this panel."
      >
        <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          <Ledger>
            <tbody>
              <LedgerRow label="Currency Nominated for the project" value={<b>AUD</b>} />
              <LedgerRow label="Amount expected to be received by UoM" value={money(summary.price)} />
              <LedgerRow label="Total Project Cost to UoM (including in-kind)" value={money(summary.totalCostFull)} />
              <LedgerRow
                label="Cash co-contributions (university investment)"
                value={money(project.cashCoContribution)}
              />
            </tbody>
          </Ledger>
          <Ledger>
            <tbody>
              <LedgerRow label="Total amount requested for project" value={money(summary.price + summary.gst)} />
              <LedgerRow label="Cost recovery multiplier used" value={summary.multiplier.toFixed(2)} />
              <LedgerRow
                label="Justification for cost recovery multiplier"
                value={project.justification || <span className="text-muted-foreground">—</span>}
              />
            </tbody>
          </Ledger>
        </div>
      </Panel>

      {summary.deanRequired && (
        <Banner tone="warn">
          <b>Dean's authorisation required.</b> Deans must authorise any reduction in the indirect
          cost recovery rate below a university specified minimum. Triggered here because{" "}
          {summary.triggers.join(" and ")}.
        </Banner>
      )}

      {summary.cat1Exempt && summary.triggers.length > 0 && (
        <Banner tone="good">
          <b>Category 1 exemption applies.</b> These would normally escalate to the dean, but
          competitive peer-reviewed grants are exempt: {summary.triggers.join("; ")}.
        </Banner>
      )}

      <Panel title="Price Summary">
        <div className="overflow-x-auto">
          <Ledger>
            <thead>
              <tr className="border-b border-hairline-soft text-[12px] text-muted-foreground">
                <th className="py-1.5 text-left font-semibold" />
                <th className="w-[190px] py-1.5 text-right font-semibold">Full Project Cost (AUD)</th>
                <th className="w-[190px] py-1.5 text-right font-semibold">
                  Price to be charged to Funder (AUD)
                </th>
              </tr>
            </thead>
            <tbody>
              <LedgerRow
                label="Indirect Cost Recovery multiplier (applied to salaries)"
                secondValue={RECOVERY.basis.toFixed(2)}
                value={summary.multiplier.toFixed(2)}
              />
              <LedgerRow label="Staff Costs (excluding in-kind)"
                secondValue={money(summary.staffFull)} value={money(summary.staffPrice)} />
              <LedgerRow label="Non-Staff Costs (excluding in-kind)"
                secondValue={money(summary.nonStaff)} value={money(summary.nonStaff)} />
              <LedgerRow tone="rule" label="Project Cost (excluding in-kind)"
                secondValue={money(summary.projectCostFull)} value={money(summary.projectCost)} />
              <LedgerRow label="In-kind (University investment) Staff Costs"
                secondValue={money(summary.inKindStaffFull)} value={money(summary.inKindStaffPrice)} />
              <LedgerRow label="In-kind (University investment) Non-Staff Costs"
                secondValue={money(summary.inKindNonStaff)} value={money(summary.inKindNonStaff)} />
              <LedgerRow tone="rule" label="Total In-kind (University investment) Project Costs"
                secondValue={money(summary.inKindTotalFull)} value={money(summary.inKindTotal)} />
              <LedgerRow label="Staff Costs % (excluding in-kind)"
                secondValue={percent(summary.staffFull, summary.projectCostFull)}
                value={percent(summary.staffPrice, summary.projectCost)} />
              <LedgerRow label="Non-Staff Costs % (excluding in-kind)"
                secondValue={percent(summary.nonStaff, summary.projectCostFull)}
                value={percent(summary.nonStaff, summary.projectCost)} />
              <LedgerRow tone="rule" label="Total Project Cost (including in-kind)"
                secondValue={money(summary.totalCostFull)} value={money(summary.totalCost)} />
              <LedgerRow label="Total Price to be charged to Funder (Excluding GST)"
                secondValue="" value={money(summary.price)} />
              <LedgerRow label="Total Price to be charged to Funder (Including GST)"
                secondValue="" value={money(summary.price + summary.gst)} />
              <LedgerRow
                tone="rule"
                label="Authorisation required by Dean/Dean's delegate?"
                secondValue=""
                value={
                  summary.deanRequired
                    ? <Badge className="bg-warn-bg text-warn">Yes</Badge>
                    : <Badge className="bg-good-bg text-good">No</Badge>
                }
              />
            </tbody>
          </Ledger>
        </div>
      </Panel>

      <Panel
        title="University position"
        info={
          <>
            The surplus or deficit resulting from the project as priced:{" "}
            <i>Price to be charged to Funder</i> less{" "}
            <i>Full Project Cost (including in-kind and cash contributions)</i>.
          </>
        }
      >
        <Ledger>
          <tbody>
            <LedgerRow
              label="Cash benefit/cost"
              value={
                <span className={summary.cashBenefit < 0 ? "text-bad" : "text-good"}>
                  {money(summary.cashBenefit)}
                </span>
              }
            />
            <LedgerRow label="Total In-kind contribution (University investment)" value={money(summary.inKindTotalFull)} />
            <LedgerRow
              label="Total Cash Co-Contribution (Department, Faculty and Chancellery)"
              value={
                <Input
                  type="number"
                  min={0}
                  className="tabular ml-auto h-8 w-[130px] bg-white text-right"
                  value={project.cashCoContribution}
                  onChange={(e) => set("cashCoContribution", Math.max(0, Number(e.target.value) || 0))}
                />
              }
            />
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
      </Panel>

      <Actions>
        <BackButton onClick={onBack} />
        <NextButton onClick={onNext}>{nextLabel}</NextButton>
      </Actions>
    </>
  )
}
