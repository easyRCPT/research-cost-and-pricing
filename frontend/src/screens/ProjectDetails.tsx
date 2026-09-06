import type { ProjectInfo } from '@/types'
import { FieldRow, Panel } from '@/components/shell'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MONTHS } from '@/lib/constants'
import { NumberSelect } from '@/components/ui/number-select'
import { Attribute } from '@/components/ui/attribute'

const CURR_YEAR = new Date().getFullYear()
const YEARS_LEN = 15

const YEAR_OPTIONS = Array.from({ length: YEARS_LEN }, (_, i) => {
  const year = CURR_YEAR - 1 + i
  return { value: year, label: String(year) }
})

const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: i + 1, label }))

interface ProjectDetailsProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectDetails({ project, onChange }: ProjectDetailsProps) {
  const sameYear = project.start_year === project.end_year
  const endYears = YEAR_OPTIONS.filter((y) => y.value >= project.start_year)
  const endMonths = MONTH_OPTIONS.filter(
    (m) => !sameYear || m.value >= project.start_month,
  )

  function setDuration(patch: Partial<ProjectInfo>) {
    const next = { ...project, ...patch }
    const endsBeforeStart =
      next.end_year < next.start_year ||
      (next.end_year === next.start_year && next.end_month < next.start_month)

    onChange(
      endsBeforeStart
        ? { ...patch, end_year: next.start_year, end_month: next.start_month }
        : patch,
    )
  }

  return (
    <Panel>
      <FieldRow label="Project title" htmlFor="title" required>
        <Input
          id="title"
          className="max-w-lg"
          value={project.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </FieldRow>

      <FieldRow label="Lead UoM chief investigator" required htmlFor="ci">
        <Input
          id="ci"
          className="max-w-sm"
          value={project.chief_investigator}
          onChange={(e) => onChange({ chief_investigator: e.target.value })}
        />
      </FieldRow>
      <FieldRow label="External party" htmlFor="funder" required>
        <Input
          id="funder"
          className="max-w-sm"
          value={project.funder}
          onChange={(e) => onChange({ funder: e.target.value })}
        />
      </FieldRow>

      <FieldRow
        label="Department"
        htmlFor="department"
        required
        hint={`Faculty — ${project.faculty}`}
      >
        <Input
          id="department"
          className="max-w-lg bg-muted text-muted-foreground"
          value={project.department}
          readOnly
        />
      </FieldRow>

      <FieldRow label="Scheme" htmlFor="scheme" hint="Grants only">
        <Input
          id="scheme"
          className="max-w-sm"
          placeholder="e.g. Discovery Projects 2027"
          value={project.scheme}
          onChange={(e) => onChange({ scheme: e.target.value })}
        />
      </FieldRow>

      <FieldRow label="Project duration" required>
        <div className="grid max-w-xl grid-cols-2 gap-3 md:grid-cols-4">
          <NumberSelect
            label="Start year"
            value={project.start_year}
            options={YEAR_OPTIONS}
            onChange={(start_year) => setDuration({ start_year })}
          />
          <NumberSelect
            label="Start month"
            value={project.start_month}
            options={MONTH_OPTIONS}
            onChange={(start_month) => setDuration({ start_month })}
          />
          <NumberSelect
            label="End year"
            value={project.end_year}
            options={endYears}
            onChange={(end_year) => setDuration({ end_year })}
          />
          <NumberSelect
            label="End month"
            value={project.end_month}
            options={endMonths}
            onChange={(end_month) => setDuration({ end_month })}
          />
        </div>
      </FieldRow>

      <FieldRow label="Project attributes">
        <div className="grid max-w-xl grid-cols-2 gap-3 rounded-md bg-muted px-4 py-3 md:grid-cols-4">
          <Attribute label="Company" value={project.company} />
          <Attribute label="Cost centre" value={project.cost_centre} />
          <Attribute label="Activity" value={project.activity} />
          <Attribute label="Region" value={project.region} />
        </div>
      </FieldRow>

      <FieldRow label="Additional information" htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          className="max-w-lg"
          placeholder="Anything the Research Office should know about this costing"
          value={project.additional_information}
          onChange={(e) => onChange({ additional_information: e.target.value })}
        />
      </FieldRow>
    </Panel>
  )
}
