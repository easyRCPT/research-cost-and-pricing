import {
  Actions, BackButton, NextButton, PageHead, Panel,
} from "@/components/shell"
import { RecoveryControl } from "@/components/RecoveryControl"
import { NonStaffTable } from "@/components/NonStaffTable"
import { Ledger, LedgerRow } from "@/components/DataTable"
import { money } from "@/lib/format"
import { useProject } from "@/state/project"

export function NonStaffCosts({
  onBack, onNext, nextLabel, withInKind = false,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
  /** Show the In Kind? column and the in-kind totals panel, as the workbook's Part C does. */
  withInKind?: boolean
}) {
  const { summary } = useProject()

  return (
    <>
      <PageHead
        title="Non-Staff Costs"
        subtitle="Part C — equipment, services, travel, student support and shared grants"
        right={<RecoveryControl />}
      />

      <Panel>
        <NonStaffTable showInKind={withInKind} />
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          * Additional costs can be difficult to determine. If no better method is available they can
          be estimated at roughly 10% of the cost of the item. It is best practice not to apply the
          additional 10% if an additional indirect rate multiplier is entered. This method is not
          appropriate for Student Support (PhD stipends) or Shared Grant Payments and is unavailable
          in those categories.
        </p>
      </Panel>

      <div className={withInKind ? "grid gap-4 md:grid-cols-2" : ""}>
        <Panel title="Non-Staff Costs" className="mb-0">
          <Ledger>
            <tbody>
              <LedgerRow
                label="Direct Non-Staff Costs (including additional 10%)"
                value={money(summary.nonStaffDirect + summary.nonStaffTenPercent)}
              />
              <LedgerRow label="Indirect Non-Staff Costs" value={money(0)} />
              <LedgerRow
                tone="rule"
                label={
                  <>
                    Non-Staff Costs Total{" "}
                    <span className="font-normal text-muted-foreground">
                      (incl. indirect rate multiplier if applied)
                    </span>
                  </>
                }
                value={money(summary.nonStaff)}
              />
            </tbody>
          </Ledger>
        </Panel>

        {withInKind && (
          <Panel title="In-kind (University investment)" className="mb-0">
            <Ledger>
              <tbody>
                <LedgerRow
                  label="Direct Non-Staff Costs (including additional 10%)"
                  value={money(summary.inKindNonStaff)}
                />
                <LedgerRow label="Indirect Non-Staff Costs" value={money(0)} />
                <LedgerRow
                  tone="rule"
                  label="In-Kind Non-Staff Costs Total"
                  value={money(summary.inKindNonStaff)}
                />
              </tbody>
            </Ledger>
          </Panel>
        )}
      </div>

      <Actions>
        <BackButton onClick={onBack} />
        <NextButton onClick={onNext}>{nextLabel}</NextButton>
      </Actions>
    </>
  )
}
