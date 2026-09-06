import { Grid, Td, Th } from '@/components/shell'

interface CodeNameGridProps {
  label: string
  rows: { code: string; name: string }[]
  className?: string
}

export function CodeNameGrid({ label, rows, className }: CodeNameGridProps) {
  return (
    <Grid className={className}>
      <thead className="sticky top-0 z-10">
        <tr>
          <Th>{label}</Th>
          <Th align="right">Code</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.code}>
            <Td>{row.name}</Td>
            <Td align="right" className="tabular">
              {row.code}
            </Td>
          </tr>
        ))}
      </tbody>
    </Grid>
  )
}
