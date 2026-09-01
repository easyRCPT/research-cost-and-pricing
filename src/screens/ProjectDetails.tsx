import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Actions, Choice, FieldRow, InfoTip, NextButton, Note, PageHead, Panel,
} from "@/components/shell"
import { useProject } from "@/state/project"
import {
  accountString, ACTIVITIES, COMPANY_CODE, DEPARTMENTS, earliestStart, EXTERNAL_PARTIES,
  hasEndDate, MONTHS,
  normaliseDuration, ORG_UNIT_BY_DEPARTMENT, OTHER_PARTY_CATEGORIES, REGIONS,
  YEARS as LOOKUP_YEARS, type Project,
} from "@/lib/rcpt-engine"

const YEARS = LOOKUP_YEARS.map(String)
const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))

export function ProjectDetails({ onNext, nextLabel }: { onNext: () => void; nextLabel: string }) {
  const { project, set, patch } = useProject()
  const unit = ORG_UNIT_BY_DEPARTMENT[project.dept]

  // A project cannot start before this month, and cannot end before it starts,
  // so each dropdown only offers what is still valid given the others.
  const floor = earliestStart()
  const startYears = YEARS.filter((y) => Number(y) >= floor.year)
  const startMonths = MONTH_OPTIONS.filter(
    (m) => project.startYear > floor.year || Number(m.value) >= floor.month,
  )
  const endYears = YEARS.filter((y) => Number(y) >= project.startYear)
  const endMonths = MONTH_OPTIONS.filter(
    (m) => project.endYear !== project.startYear || Number(m.value) >= project.startMonth,
  )

  const setDuration = (values: Partial<Project>) =>
    patch(normaliseDuration({ ...project, ...values }))

  return (
    <>
      <PageHead
        title="Project Details"
        subtitle="Part A — project identity, duration and account attributes"
      />

      <Panel>
        <FieldRow label="Project Title (Name)" required="*">
          <Input
            className="max-w-[520px] bg-white"
            value={project.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </FieldRow>

        <FieldRow label="Lead UoM Chief Investigator" required="*">
          <Input
            className="max-w-[400px] bg-white"
            value={project.ci}
            onChange={(e) => set("ci", e.target.value)}
          />
        </FieldRow>

        <FieldRow label="External Party" required="*">
          <Choice
            className="max-w-[340px]"
            allowBlank={false}
            value={project.funder}
            options={EXTERNAL_PARTIES}
            onChange={(v) => set("funder", v)}
          />
        </FieldRow>

        {project.funder === "Other" && (
          <>
            <FieldRow label="Other Party Category">
              <Choice
                className="max-w-[400px]"
                placeholder="Select a category…"
                value={project.otherFunderCategory}
                options={OTHER_PARTY_CATEGORIES}
                onChange={(v) => set("otherFunderCategory", v)}
              />
            </FieldRow>
            <FieldRow label="Specify Other Funder">
              <Input
                className="max-w-[400px] bg-white"
                value={project.otherFunder}
                onChange={(e) => set("otherFunder", e.target.value)}
              />
            </FieldRow>
          </>
        )}

        <FieldRow label="Research type" hint="sets the Category 1 exemption">
          <Choice
            className="max-w-[400px]"
            allowBlank={false}
            value={project.researchType}
            options={[
              { value: "cat1", label: "Grant Category 1" },
              { value: "noncat1", label: "Grant Non-Category 1" },
              { value: "contract", label: "Contract Research" },
            ]}
            onChange={(v) => set("researchType", v as typeof project.researchType)}
          />
        </FieldRow>

        <FieldRow label="Department" required="*">
          <div className="flex flex-wrap items-center gap-3">
            <Choice
              className="max-w-[420px]"
              placeholder="Select a department…"
              value={project.dept}
              options={DEPARTMENTS}
              onChange={(v) => set("dept", v)}
            />
            <span className="text-[13px] text-muted-foreground">Faculty</span>
            <span className="text-[13.5px]">{unit?.faculty ?? "—"}</span>
          </div>
          {unit && <Note>School — {unit.school}</Note>}
        </FieldRow>

        <FieldRow label="Scheme" hint="(Grants Only)">
          <Input
            className="max-w-[400px] bg-white"
            placeholder="e.g. Discovery Projects 2026"
            value={project.scheme}
            onChange={(e) => set("scheme", e.target.value)}
          />
        </FieldRow>

        <FieldRow label="Project Duration" required="*">
          <div className="grid max-w-[640px] grid-cols-2 gap-3 md:grid-cols-4">
            <Labelled label="Start Year">
              <Choice allowBlank={false} value={String(project.startYear)} options={startYears}
                onChange={(v) => setDuration({ startYear: Number(v) })} />
            </Labelled>
            <Labelled
              label={
                <>
                  Start Month{" "}
                  <InfoTip label="How the month affects calculations">
                    The month WILL impact calculations — the tool assumes expenditure only in the
                    specified time period.
                  </InfoTip>
                </>
              }
            >
              <Choice allowBlank={false} value={String(project.startMonth)} options={startMonths}
                onChange={(v) => setDuration({ startMonth: Number(v) })} />
            </Labelled>
            <Labelled label={<>End Year <span className="text-bad">^</span></>}>
              <Choice
                placeholder="Select…"
                value={project.endYear ? String(project.endYear) : ""}
                options={endYears}
                onChange={(v) => setDuration({ endYear: Number(v) })}
              />
            </Labelled>
            <Labelled label={<>End Month <span className="text-bad">^</span></>}>
              <Choice
                placeholder={project.endYear ? "Select…" : "—"}
                disabled={!project.endYear}
                value={project.endMonth ? String(project.endMonth) : ""}
                options={endMonths}
                onChange={(v) => setDuration({ endMonth: Number(v) })}
              />
            </Labelled>
          </div>
        </FieldRow>

        <FieldRow label="Budget Currency" required="*">
          <Input className="max-w-[340px] bg-fill text-muted-foreground" value="AUD - Australian Dollar" readOnly />
        </FieldRow>

        <FieldRow
          label={
            <>
              Project Attributes<span className="text-bad">#</span>{" "}
              <InfoTip label="How the account string is built">
                Company and Cost Centre follow the Department.
              </InfoTip>
            </>
          }
        >
          <div className="max-w-[760px] rounded-md bg-fill px-4 py-3.5">
            <div className="grid grid-cols-2 gap-3 border-b border-hairline pb-3 md:grid-cols-4">
              <Attribute label="Company" value={COMPANY_CODE} />
              <Attribute label="Cost Centre" value={unit?.deptCode} />
              <div>
                <div className="text-[12.5px] text-muted-foreground">Activity</div>
                <Choice
                  className="mt-0.5 h-8 bg-white text-[12.5px]"
                  allowBlank={false}
                  value={project.activity}
                  options={ACTIVITIES}
                  onChange={(v) => set("activity", v)}
                />
              </div>
              <div>
                <div className="text-[12.5px] text-muted-foreground">Region</div>
                <Choice
                  className="mt-0.5 h-8 bg-white text-[12.5px]"
                  allowBlank={false}
                  value={project.region}
                  options={REGIONS}
                  onChange={(v) => set("region", v)}
                />
              </div>
            </div>
            <div className="flex gap-2.5 pt-2.5 text-[13px]">
              <span className="text-muted-foreground">Account string</span>
              <span>{accountString(project.dept, project.activity, project.region) || "—"}</span>
            </div>
          </div>
        </FieldRow>

        <FieldRow label="Additional Information / Comments">
          <Textarea
            rows={3}
            className="max-w-[520px] bg-white"
            placeholder="Anything the Research Office should know about this costing…"
            value={project.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </FieldRow>

        <div className="mt-5 max-w-[900px] space-y-1 text-[12.5px] text-muted-foreground">
          <p><span className="text-bad">*</span> Required</p>
          <p>
            <span className="text-bad">#</span> Please review the fields in the Project Attributes
            section and make the necessary adjustments if/where required. If information is not
            provided, information will be sought from academic support staff or the use of default codes.
          </p>
          <p>
            <span className="text-bad">^</span> 'Staff Costs' tab will not function if an end date is not specified.
          </p>
        </div>
      </Panel>

      <Actions>
        <Button variant="outline" size="lg">Save draft</Button>
        <NextButton
          onClick={onNext}
          disabled={!hasEndDate(project)}
          disabledReason="Set the project end date first — Staff Costs will not function without it."
        >
          {nextLabel}
        </NextButton>
      </Actions>
    </>
  )
}

function Labelled({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[12.5px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Attribute({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[12.5px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[13.5px]">{value ?? "—"}</div>
    </div>
  )
}
