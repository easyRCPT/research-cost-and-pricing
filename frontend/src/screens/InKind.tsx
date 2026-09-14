import { Checkbox } from "@/components/ui/checkbox"
import {
  Actions, BackButton, Banner, NextButton, PageHead, Panel,
} from "@/components/shell"
import { RecoveryControl } from "@/components/RecoveryControl"
import { IndirectOnInKind } from "@/components/IndirectOnInKind"
import { CellNote, CellTd, Grid, Ledger, LedgerRow, Td, Th } from "@/components/DataTable"
import { money } from "@/lib/format"
import { useProject } from "@/state/project"
import { RECOVERY, nonStaffLine, staffLine } from "@/lib/rcpt-engine"

/**
 * Every cost already entered, listed once, with a single decision against each:
 * does the funder pay for it, or does the University absorb it?
 */
export function InKind({
  onBack, onNext, nextLabel,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
}) {
  const { project, summary, patchStaff, patchNonStaff } = useProject()

  const staffRows = project.staff
    .map((row) => ({
      id: row.id,
      kind: "staff" as const,
      label: row.name || "(unnamed person)",
      detail: [row.category, row.employment, row.classification].filter(Boolean).join(" · ") || "—",
      cost: staffLine(row, project, RECOVERY.basis).fullCost,
      inKind: row.inKind,
      reason: row.inKindReason,
    }))
    .filter((r) => r.cost > 0 || r.label !== "(unnamed person)")

  const nonStaffRows = project.nonStaff
    .map((row) => ({
      id: row.id,
      kind: "nonStaff" as const,
      label: row.desc || row.group || "(untitled cost)",
      detail: row.group || "—",
      cost: nonStaffLine(row).total,
      inKind: row.inKind,
      reason: row.inKindReason,
    }))
    .filter((r) => r.cost > 0 || r.label !== "(untitled cost)")

  const setInKind = (kind: "staff" | "nonStaff", id: string, value: boolean) =>
    kind === "staff" ? patchStaff(id, { inKind: value }) : patchNonStaff(id, { inKind: value })

  const setReason = (kind: "staff" | "nonStaff", id: string, value: string) =>
    kind === "staff" ? patchStaff(id, { inKindReason: value }) : patchNonStaff(id, { inKindReason: value })

  const rows = [...staffRows, ...nonStaffRows]

  return (
    <>
      <PageHead
        title="In-Kind Contributions"
        subtitle="University investment — the costs the funder is not charged for"
        right={<RecoveryControl />}
      />

      <Banner tone="inkind">
        In-kind costs stay in the University's cost and come out of the price. Nothing new is entered
        here — tick the lines from Staff Costs and Non-Staff Costs that the University will absorb.
      </Banner>

      <Panel title="Costs already entered" info="Tick a line to have the University absorb it rather than charge the funder for it.">
        <Grid>
          <thead>
            <tr>
              <Th>Cost line</Th>
              <Th>Detail</Th>
              <Th align="right">Cost (AUD)</Th>
              <Th align="center">In kind?</Th>
              <Th>Reason the University absorbs it</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.id}`}>
                <Td className="align-top py-1.5">{row.label}</Td>
                <Td className="align-top py-1.5 text-muted-foreground">{row.detail}</Td>
                <Td align="right" className="tabular align-top py-1.5">{money(row.cost)}</Td>
                <Td align="center" className="align-top py-1.5">
                  <Checkbox
                    className="mx-auto"
                    checked={row.inKind}
                    onCheckedChange={(v) => setInKind(row.kind, row.id, v === true)}
                  />
                </Td>
                <CellTd className="align-top">
                  {row.inKind ? (
                    <CellNote
                      // One line to start with; it grows as the reason is written.
                      className="min-w-[300px]"
                      placeholder="Why is the University absorbing this?"
                      value={row.reason}
                      onChange={(e) => setReason(row.kind, row.id, e.target.value)}
                    />
                  ) : (
                    <span className="block px-1.5 py-1.5 text-muted-foreground">—</span>
                  )}
                </CellTd>
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
      </Panel>

      <Panel
        title="Cost recovery on in-kind contributions"
        info={
          <>
            Useful where cost recovery, but not salaries, can be charged on a project. It is
            calculated at full cost recovery ({RECOVERY.basis.toFixed(2)}) — the average full
            indirect cost of research activity across the University — rather than at the
            multiplier the project is priced at.
          </>
        }
      >
        <IndirectOnInKind />
      </Panel>

      <Panel title="Total University investment">
        <Ledger>
          <tbody>
            <LedgerRow label="In-kind staff costs" value={money(summary.inKindStaffFull)} />
            <LedgerRow label="In-kind non-staff costs" value={money(summary.inKindNonStaff)} />
            <LedgerRow tone="rule" label="Total in-kind (University investment)" value={money(summary.inKindTotalFull)} />
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
