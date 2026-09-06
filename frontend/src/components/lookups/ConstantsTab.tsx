import { Grid, Note, Panel, Td, Th } from '@/components/shell'
import { money } from '@/lib/format/utils'
import type { LookupTables } from '@/types'

const percentage = (value: number | undefined) =>
  value === undefined ? '—' : `${(value * 100).toFixed(2)}%`

const CONSTANT_FORMAT: Record<string, (value: number) => string> = {
  gst_rate: percentage,
  max_leave_loading: money,
}

const formatConstant = (name: string, value: number) =>
  (CONSTANT_FORMAT[name] ?? String)(value)

interface ConstantsTabProps {
  data: LookupTables
}

export function ConstantsTab({ data }: ConstantsTabProps) {
  return (
    <div className="space-y-4">
      <Panel title="All constants">
        <Grid>
          <thead>
            <tr>
              <Th>Constant</Th>
              <Th align="right" className="w-[180px]">
                Value
              </Th>
            </tr>
          </thead>
          <tbody>
            {data.calculation_constants.map((constant) => (
              <tr key={constant.name}>
                <Td>{constant.description}</Td>
                <Td align="right" className="tabular">
                  {formatConstant(constant.name, constant.value)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
      </Panel>

      <Panel
        title="Minimum cost recovery by year"
        description="Overrides the fixed multiplier for the years listed."
      >
        {data.minimum_cost_recovery_multipliers.length === 0 ? (
          <Note>No rows seeded yet.</Note>
        ) : (
          <Grid>
            <thead>
              <tr>
                <Th>Year</Th>
                <Th align="right">Multiplier</Th>
              </tr>
            </thead>
            <tbody>
              {data.minimum_cost_recovery_multipliers.map((row) => (
                <tr key={row.year}>
                  <Td className="tabular">{row.year}</Td>
                  <Td align="right" className="tabular">
                    {row.multiplier.toFixed(4)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Grid>
        )}
      </Panel>
    </div>
  )
}
