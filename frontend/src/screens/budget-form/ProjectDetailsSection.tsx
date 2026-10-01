import { PartBar } from '@/components/shell'
import { MONTHS } from '@/lib/constants'
import { money } from '@/lib/format/utils'
import type { PriceSummary, ProjectInfo } from '@/types'

import { DASH, or } from './format'
import { KeyValues } from './KeyValues'

interface ProjectDetailsSectionProps {
  project: ProjectInfo
  years: number[]
  summary: PriceSummary
}

export function ProjectDetailsSection({
  project,
  years,
  summary,
}: ProjectDetailsSectionProps) {
  const duration =
    project.end_month === null
      ? DASH
      : `${MONTHS[project.start_month - 1]} ${years[0]} to ${
          MONTHS[project.end_month - 1]
        } ${years[years.length - 1]}`

  return (
    <>
      <PartBar>PART A — Project Details</PartBar>
      <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
        <KeyValues
          rows={[
            ['Project Title', or(project.title)],
            ['External Party', or(project.funder)],
            ['Lead UoM Chief Investigator', or(project.chief_investigator)],
            ['Department', or(project.department)],
          ]}
        />
        <KeyValues
          rows={[
            ['Project Duration', duration],
            ['Budget Currency', 'AUD - Australian Dollar'],
            ['Project Attributes', DASH],
            [
              'Total Contract Value (Excl. GST)',
              money(summary.total_price_exc_gst),
            ],
          ]}
        />
      </div>
    </>
  )
}
