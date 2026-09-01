import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Actions, BackButton, Banner, NextButton, PageHead, Panel,
} from "@/components/shell"
import { RecoveryControl } from "@/components/RecoveryControl"
import { StaffTable } from "@/components/StaffTable"
import { IndirectOnInKind } from "@/components/IndirectOnInKind"
import { useProject } from "@/state/project"

/**
 * `withInKind` renders the workbook's Part B in full: direct salary, in-kind
 * staff time and the indirect calculation on in-kind. When it is off the screen
 * is costing only and in-kind is decided later, on its own screen.
 */
export function StaffCosts({
  onBack, onNext, nextLabel, withInKind = false,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
  withInKind?: boolean
}) {
  const { project, summary, set } = useProject()
  const charged = project.staff.filter((r) => !r.inKind)
  const absorbed = project.staff.filter((r) => r.inKind)

  return (
    <>
      <PageHead
        title="Staff Costs"
        subtitle={
          withInKind
            ? "Part B — direct salary, in-kind contributions and indirect recovery"
            : "Part B — direct salary and on-costs paid by the project"
        }
        right={<RecoveryControl />}
      />

      <Banner tone="info">
        Staff costs include the base salary plus salary on-costs plus overheads. The base salary rate
        shown is as at <b>01-Nov-2025</b>; EBA-mandated increases are applied automatically for later years.
      </Banner>

      <Panel
        title={withInKind ? "1. Direct Salary and On-Costs Paid by the Project" : "Direct Salary and On-Costs Paid by the Project"}
        info="Overheads are calculated by applying the cost recovery multiplier to base salary plus salary on-costs."
      >
        {/* A standalone question, not a form field — it reads on one line. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px]">
          <span className="font-medium">
            Have all Chief Investigators costs been included in this page?
          </span>
          <RadioGroup
            // The base class is w-full, which would push the options onto their own line.
            className="flex w-auto gap-5"
            value={project.ciCostsIncluded ? "yes" : "no"}
            onValueChange={(v) => set("ciCostsIncluded", v === "yes")}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="ci-yes" />
              <Label htmlFor="ci-yes" className="font-normal">Yes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="ci-no" />
              <Label htmlFor="ci-no" className="font-normal">No</Label>
            </div>
          </RadioGroup>
        </div>

        <StaffTable rows={charged} multiplier={summary.multiplier} addLabel="Add row" />
      </Panel>

      {withInKind && (
        <>
          <Panel
            title="2. In-kind contributions (University investment) of Staff Time to the Project"
            info={
              <>
                Required, but for information purposes, unless in-kind contributions (University
                investment) are not required by a sponsor. It is <b>NOT</b> included in the price
                charged to a sponsor or a client.
              </>
            }
          >
            <StaffTable
              rows={absorbed}
              multiplier={summary.inKindMultiplier}
              addLabel="Add row"
              inKind
            />

          </Panel>

          <Panel
            title="3. Indirect Cost Calculation on In-kind contributions — use as needed"
            info="Calculating cost recovery on in-kind contributions is useful where cost recovery, but not salaries, can be charged on a project."
          >
            <IndirectOnInKind />
          </Panel>
        </>
      )}

      <Actions>
        <BackButton onClick={onBack} />
        <NextButton onClick={onNext}>{nextLabel}</NextButton>
      </Actions>
    </>
  )
}

