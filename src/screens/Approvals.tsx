import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Actions, BackButton, Banner, Choice, InfoTip, PageHead, Panel, PartBar,
} from "@/components/shell"
import { useProject } from "@/state/project"
import { JUSTIFICATION_OPTIONS } from "@/lib/rcpt-engine"

export function Approvals({ onBack }: { onBack: () => void }) {
  const { project, summary, set } = useProject()

  return (
    <>
      <PageHead
        title="Approvals"
        subtitle="Signatures required before the budget form can be submitted"
        right={<Badge className="bg-warn-bg text-warn">Awaiting Head of Department</Badge>}
      />

      <Panel>
        <PartBar>PART C — Authorisation by Department</PartBar>
        <SignatureBlock title="Budget Form completed by:" />
        <SignatureBlock title="Head of Department Authorisation:" />

        <PartBar
          info={
            <>
              Required if the cost recovery multiplier is less than{" "}
              {summary.minRecovery.toFixed(2)} OR there are in-kind contributions (University
              investment). The multiplier in use is {summary.multiplier.toFixed(2)}.
            </>
          }
        >
          PART D — Authorisation by Faculty / School
        </PartBar>
        {summary.deanRequired && (
          <Banner tone="warn">Dean's authorisation is required for this project.</Banner>
        )}
        <SignatureBlock title="Faculty / School Authorisation #1:" />
        <SignatureBlock title="Faculty / School Authorisation #2:" />

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[13.5px] text-muted-foreground">
            Reason for discounting or subsidising the project costs{" "}
            <InfoTip>
              Select a reason, and add anything further below. It facilitates contract execution and
              heads off requests for additional explanation. Complete it before presenting to a Dean
              or Dean's delegate.
            </InfoTip>
          </span>
          <Choice
            className="w-[420px] max-w-full bg-white"
            placeholder="Choose a reason…"
            value={project.justification}
            options={JUSTIFICATION_OPTIONS}
            onChange={(v) => set("justification", v)}
          />
        </div>
        <Textarea
          rows={3}
          className="mt-3 max-w-[760px] bg-white"
          placeholder="Additional information…"
          value={project.justificationNotes}
          onChange={(e) => set("justificationNotes", e.target.value)}
        />

        <div className="mt-5">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            Reason authorisation is not required from a Dean/Dean's delegate:
            <InfoTip>
              Authorisation is not required where documented sponsor requirements prohibit full
              costing. In such cases, give a clear explanation here.
            </InfoTip>
          </div>
          <Textarea
            rows={3}
            className="mt-2 max-w-[760px] bg-white"
            value={project.deanExemptionReason}
            onChange={(e) => set("deanExemptionReason", e.target.value)}
          />
        </div>
      </Panel>

      <Actions>
        <BackButton onClick={onBack} />
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          Export PDF
        </Button>
        <Button size="lg">Submit for approval</Button>
      </Actions>
    </>
  )
}

function SignatureBlock({ title }: { title: string }) {
  return (
    <div className="mt-4">
      <div className="text-[13.5px] font-semibold">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-5 md:grid-cols-4">
        {["Signature", "Name (please print)", "Position (please print)", "Date"].map((label) => (
          <div key={label}>
            <div className="h-10 border-b border-neutral-400" />
            <span className="text-[12.5px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
