import { PartBar } from '@/components/shell'
import { MONTHS } from '@/lib/constants'
import { useMoney } from '@/lib/format/currency'
import type { BudgetInfo, PriceSummary, ProjectInfo } from '@/types'

import { DASH, or } from './format'
import { KeyValues } from './KeyValues'

interface ProjectDetailsSectionProps {
  project: ProjectInfo
  years: number[]
  summary: PriceSummary
  info: Pick<BudgetInfo, 'currency' | 'exchange_rate'>
}

export function ProjectDetailsSection({
  project,
  years,
  summary,
  info,
}: ProjectDetailsSectionProps) {
  const money = useMoney()
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
            [
              'Budget Currency',
              info.currency === 'AUD'
                ? 'AUD - Australian Dollar'
                : `${info.currency}, at 1 AUD = ${info.exchange_rate} ${info.currency}`,
            ],
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
