import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { SideRail, TopBar, type RailSection } from "@/components/shell"
import { ProjectProvider, useProject } from "@/state/project"
import { emptyProject, hasEndDate } from "@/lib/rcpt-engine"
import { ProjectDetails } from "@/screens/ProjectDetails"
import { StaffCosts } from "@/screens/StaffCosts"
import { NonStaffCosts } from "@/screens/NonStaffCosts"
import { InKind } from "@/screens/InKind"
import { PriceSummary } from "@/screens/PriceSummary"
import { BudgetForm } from "@/screens/BudgetForm"
import { Approvals } from "@/screens/Approvals"
import { LookupTables } from "@/screens/LookupTables"

/**
 * Split flow — costing is staff and non-staff only. In-kind sits under pricing,
 * because deciding what the University absorbs is a pricing decision, and it is
 * made against the costs already entered rather than in a table of its own.
 */
const SECTIONS: RailSection[] = [
  { items: [{ id: "details", label: "Project Details" }] },
  {
    label: "Costing",
    items: [
      { id: "staff", label: "Staff Costs" },
      { id: "nonstaff", label: "Non-Staff Costs" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { id: "inkind", label: "In-Kind Contributions" },
      { id: "price", label: "Price Summary" },
    ],
  },
  {
    label: "Authorisation",
    items: [
      { id: "budget", label: "Budget Form" },
      { id: "approvals", label: "Approvals" },
    ],
  },
]

const ORDER = SECTIONS.flatMap((s) => s.items.map((i) => i.id))

const initialProject = () => emptyProject(6, 6)

/**
 * Everything past Project Details is costed year by year, so all of it waits on
 * the end date — the costing screens directly, the rest through what they feed.
 */
const NEEDS_DURATION = ORDER.filter((id) => id !== "details")

export default function App() {
  const [screen, setScreen] = useState(() => window.location.hash.slice(1) || "details")

  const go = (id: string) => {
    setScreen(id)
    window.location.hash = id
    window.scrollTo({ top: 0 })
  }
  const step = (delta: number) => {
    const index = ORDER.indexOf(screen)
    if (index >= 0) go(ORDER[Math.min(ORDER.length - 1, Math.max(0, index + delta))])
  }

  return (
    <ProjectProvider initial={initialProject}>
      <div className="min-h-screen bg-page">
        <TopBar
          right={
            <Button
              variant="outline"
              size="lg"
              aria-pressed={screen === "lookup"}
              className={
                screen === "lookup"
                  ? "border-white bg-white text-navy hover:bg-white"
                  : "border-white/55 bg-transparent text-white hover:bg-white/10 hover:text-white"
              }
              onClick={() => go(screen === "lookup" ? "details" : "lookup")}
            >
              Lookup Tables
            </Button>
          }
        />

        <div className="grid md:grid-cols-[236px_minmax(0,1fr)]">
          <Flow screen={screen} go={go} />

          <main className="max-w-[1260px] px-8 py-7 pb-24">
            {screen === "details" && (
              <ProjectDetails onNext={() => step(1)} nextLabel="Continue to Staff Costs" />
            )}
            {screen === "staff" && (
              <StaffCosts
                onBack={() => step(-1)}
                onNext={() => step(1)}
                nextLabel="Continue to Non-Staff Costs"
              />
            )}
            {screen === "nonstaff" && (
              <NonStaffCosts
                onBack={() => step(-1)}
                onNext={() => step(1)}
                nextLabel="Continue to In-Kind"
              />
            )}
            {screen === "inkind" && (
              <InKind
                onBack={() => step(-1)}
                onNext={() => step(1)}
                nextLabel="Continue to Price Summary"
              />
            )}
            {screen === "price" && (
              <PriceSummary
                onBack={() => step(-1)}
                onNext={() => step(1)}
                nextLabel="Generate Budget Form"
              />
            )}
            {screen === "budget" && (
              <BudgetForm
                onBack={() => step(-1)}
                onNext={() => step(1)}
                nextLabel="Continue to Approvals"
              />
            )}
            {screen === "approvals" && <Approvals onBack={() => step(-1)} />}
            {screen === "lookup" && <LookupTables />}
          </main>
        </div>
      </div>
    </ProjectProvider>
  )
}

/**
 * The rail, with the costing steps held shut until the project has an end date.
 * It reads the project, so it has to sit inside the provider.
 */
function Flow({ screen, go }: { screen: string; go: (id: string) => void }) {
  const { project } = useProject()
  const ready = hasEndDate(project)
  const locked = ready
    ? {}
    : Object.fromEntries(
        NEEDS_DURATION.map((id) => [id, "Set the project end date first — the rest of the tool is costed from it."]),
      )

  // A stale hash could otherwise drop someone straight onto a locked screen.
  const stranded = !ready && NEEDS_DURATION.includes(screen)
  useEffect(() => {
    if (stranded) go("details")
  }, [stranded])

  return <SideRail sections={SECTIONS} current={screen} onSelect={go} locked={locked} />
}
