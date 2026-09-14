import { FieldRow } from '@/components/shell'
import { NumberSelect } from '@/components/ui/number-select'
import { MONTHS } from '@/lib/constants'
import type { ProjectInfo } from '@/types'

interface ProjectDurationRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

const CURR_YEAR = new Date().getFullYear()
const YEARS_LEN = 15
const YEAR_OPTIONS = Array.from({ length: YEARS_LEN }, (_, i) => {
  const year = CURR_YEAR - 1 + i
  return { value: year, label: String(year) }
})
const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: i + 1, label }))

export function ProjectDurationRow({
  project,
  onChange,
}: ProjectDurationRowProps) {
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
    <FieldRow label="Project duration" required sublabelled>
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
  )
}
