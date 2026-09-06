import { Grid, Note, Panel, Td, Th } from '@/components/shell'
import type { LookupTables } from '@/types'

interface EbaTabProps {
  increases: LookupTables['eba_increases']
  incrementCaps: LookupTables['increment_caps']
}

export function EbaTab({ increases, incrementCaps }: EbaTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="EBA increases by year">
        <Grid>
          <thead>
            <tr>
              <Th>Year</Th>
              <Th align="right">Multiplier</Th>
            </tr>
          </thead>
          <tbody>
            {increases.map((increase) => (
              <tr key={increase.year}>
                <Td className="tabular">{increase.year}</Td>
                <Td align="right" className="tabular">
                  {increase.multiplier.toFixed(4)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
        <Note>
          Cumulative on the base-year rate, compounded from the first year
          listed.
        </Note>
      </Panel>

      <Panel title="Salary increment caps">
        <Grid>
          <thead>
            <tr>
              <Th>Classification family</Th>
              <Th align="right">Max. step</Th>
            </tr>
          </thead>
          <tbody>
            {incrementCaps.map((cap) => (
              <tr key={cap.level}>
                <Td>{cap.level}</Td>
                <Td align="right" className="tabular">
                  {cap.max_steps}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
        <Note>A step advances once per prior year worked.</Note>
      </Panel>
    </div>
  )
}
