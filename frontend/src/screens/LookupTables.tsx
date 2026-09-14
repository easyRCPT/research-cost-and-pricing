import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Note, PageHead, Panel } from "@/components/shell"
import { Grid, Td, Th } from "@/components/DataTable"
import { money2 } from "@/lib/format"
import {
  EBA_INCREASE, NON_STAFF_EXPENSES, ORG_UNITS, SALARY_MAX_STEP, SALARY_RATES, ebaMultiplier,
} from "@/lib/rcpt-engine"

const rateRows = Object.entries(SALARY_RATES).map(([key, rate]) => {
  const payroll = key.startsWith("Casual") ? "Casual" : "Fortnight"
  const rest = key.slice(payroll.length)
  const category = rest.startsWith("Academic") ? "Academic" : "Professional"
  return { payroll, category, classification: rest.slice(category.length), rate }
})

const capPairs = (() => {
  const entries = Object.entries(SALARY_MAX_STEP)
  const half = Math.ceil(entries.length / 2)
  return Array.from({ length: half }, (_, i) => [entries[i], entries[i + half]] as const)
})()

const STIPENDS: [number, string][] = [
  [2026, "$39,500"], [2027, "$41,100"], [2028, "$42,333"], [2029, "$43,603"], [2030, "$44,911"],
]

export function LookupTables() {
  return (
    <>
      <PageHead
        title="Lookup Tables"
        subtitle="Reference data — administrator editable"
        right={<Button variant="outline" size="lg">Add row</Button>}
      />

      <Tabs defaultValue="rates">
        <TabsList className="mb-5">
          <TabsTrigger value="rates">Salary Rates</TabsTrigger>
          <TabsTrigger value="eba">EBA Increases</TabsTrigger>
          <TabsTrigger value="super">Superannuation &amp; On-costs</TabsTrigger>
          <TabsTrigger value="caps">Caps, Multipliers &amp; Stipends</TabsTrigger>
          <TabsTrigger value="orgunits">Org Units</TabsTrigger>
          <TabsTrigger value="expenses">Non-Staff Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="rates">
          <Panel
            title="Salary Rates"
            description={`Effective 01-Nov-2025 · ${rateRows.length} rows`}
          >
            <div className="max-h-[560px] overflow-y-auto rounded-lg">
              <Grid>
                <thead className="sticky top-0">
                  <tr>
                    <Th>Payroll Type</Th>
                    <Th>Category</Th>
                    <Th>Classification</Th>
                    <Th align="right">Rate (est)</Th>
                  </tr>
                </thead>
                <tbody>
                  {rateRows.map((r) => (
                    <tr key={r.payroll + r.category + r.classification}>
                      <Td>{r.payroll}</Td>
                      <Td>{r.category}</Td>
                      <Td>{r.classification}</Td>
                      <Td align="right" className="tabular">{money2(r.rate)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Grid>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="eba">
          <Panel title="EBA Increases by year">
            <Grid>
              <thead>
                <tr>
                  <Th>Year</Th>
                  <Th align="right">EBA Increase</Th>
                  <Th align="right">EBA Multiplier</Th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, i) => 2025 + i).map((year) => (
                  <tr key={year}>
                    <Td>{year}</Td>
                    <Td align="right" className="tabular">
                      {EBA_INCREASE[year] ? `${(EBA_INCREASE[year] * 100).toFixed(1)}%` : "—"}
                    </Td>
                    <Td align="right" className="tabular">{ebaMultiplier(year).toFixed(4)}</Td>
                  </tr>
                ))}
              </tbody>
            </Grid>
          </Panel>
        </TabsContent>

        <TabsContent value="super">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Superannuation" description="2026 onwards" className="mb-0">
              <Grid>
                <thead>
                  <tr><Th>Staff Type</Th><Th align="right">Superannuation</Th></tr>
                </thead>
                <tbody>
                  {[["Continuing", "17%"], ["Fixed-Term", "17%"], ["Casual", "12%"]].map(([k, v]) => (
                    <tr key={k}>
                      <Td>{k}</Td>
                      <Td align="right" className="tabular">{v}</Td>
                    </tr>
                  ))}
                </tbody>
              </Grid>
            </Panel>

            <Panel title="On-cost components" className="mb-0">
              <Grid>
                <thead>
                  <tr>
                    <Th>Component</Th>
                    <Th align="right">Continuing</Th>
                    <Th align="right">Fixed-Term</Th>
                    <Th align="right">Casual</Th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Leave Loading", "1.34%", "1.34%", "0%"],
                    ["Payroll Tax", "5.85%", "5.85%", "5.85%"],
                    ["WorkCover", "0.5%", "0.5%", "0.5%"],
                    ["Parental Leave", "1.0%", "1.0%", "0%"],
                    ["Long Service Leave", "0.5%", "0.5%", "0%"],
                    ["Annual Leave Provision", "12%", "12%", "0%"],
                  ].map(([component, ...cells]) => (
                    <tr key={component}>
                      <Td>{component}</Td>
                      {cells.map((c, i) => (
                        <Td key={i} align="right" className="tabular">{c}</Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Grid>
              <Note>
                Working days per year <b>260.892</b> · Leave loading maximum <b>$1,611.30</b>
              </Note>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="caps">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Salary increment caps" className="mb-0">
              <Grid>
                <thead>
                  <tr>
                    <Th>Classification</Th><Th align="right">Max. Step</Th>
                    <Th>Classification</Th><Th align="right">Max. Step</Th>
                  </tr>
                </thead>
                <tbody>
                  {capPairs.map(([a, b]) => (
                    <tr key={a[0]}>
                      <Td>{a[0]}</Td>
                      <Td align="right" className="tabular">{a[1]}</Td>
                      <Td>{b?.[0] ?? ""}</Td>
                      <Td align="right" className="tabular">{b?.[1] ?? ""}</Td>
                    </tr>
                  ))}
                </tbody>
              </Grid>
            </Panel>

            <div>
              <Panel title="Cost Recovery Multipliers">
                <Grid>
                  <thead><tr><Th /><Th align="right">Multiplier</Th></tr></thead>
                  <tbody>
                    <tr><Td>Full cost recovery</Td><Td align="right" className="tabular">2.5</Td></tr>
                    <tr><Td>Minimum allowed (2024–2030)</Td><Td align="right" className="tabular">2.2</Td></tr>
                  </tbody>
                </Grid>
              </Panel>
              <Panel title="Post-Graduate Stipend rates" className="mb-0">
                <Grid>
                  <thead><tr><Th>Year</Th><Th align="right">GR Stipend Rate</Th></tr></thead>
                  <tbody>
                    {STIPENDS.map(([year, rate]) => (
                      <tr key={year}>
                        <Td>{year}</Td>
                        <Td align="right" className="tabular">{rate}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Grid>
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orgunits">
          <Panel
            title="Org Units"
            description={`Department, School and Faculty · ${ORG_UNITS.length} rows. The Department dropdown on Project Details reads from here, and Cost Centre follows the department code.`}
          >
            <div className="max-h-[560px] overflow-y-auto rounded-lg">
              <Grid>
                <thead className="sticky top-0">
                  <tr>
                    <Th>Department</Th>
                    <Th>Dept code</Th>
                    <Th>School</Th>
                    <Th>Faculty</Th>
                  </tr>
                </thead>
                <tbody>
                  {ORG_UNITS.map((u) => (
                    <tr key={u.deptCode}>
                      <Td>{u.department}</Td>
                      <Td className="text-muted-foreground">{u.deptCode}</Td>
                      <Td>{u.school}</Td>
                      <Td>{u.faculty}</Td>
                    </tr>
                  ))}
                </tbody>
              </Grid>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="expenses">
          <Panel
            title="Non-Staff Expense Types"
            description="Each cost group has a fixed set of expense types, and each one books to a ledger."
          >
            <Grid>
              <thead>
                <tr>
                  <Th>Cost group</Th>
                  <Th>Expense type</Th>
                  <Th align="right" className="w-[110px]">Ledger ID</Th>
                </tr>
              </thead>
              <tbody>
                {NON_STAFF_EXPENSES.map((e) => (
                  <tr key={e.ledgerId}>
                    <Td>{e.category}</Td>
                    <Td>{e.expense}</Td>
                    <Td align="right" className="tabular">{e.ledgerId}</Td>
                  </tr>
                ))}
              </tbody>
            </Grid>
            <Note>
              Regions and activity codes are wired to the Project Attributes dropdowns; deliverable
              types to Part J of the Budget Form.
            </Note>
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  )
}
