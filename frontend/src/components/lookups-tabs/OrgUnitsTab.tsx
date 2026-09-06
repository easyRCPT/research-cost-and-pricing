import { Grid, Panel, Td, Th } from '@/components/shell'
import type { LookupTables } from '@/types'

interface OrgUnitsTabProps {
  departments: LookupTables['departments']
}

export function OrgUnitsTab({ departments }: OrgUnitsTabProps) {
  return (
    <Panel
      title="Org Units"
      description={`Department, School and Faculty · ${departments.length} rows`}
    >
      <Grid className="max-h-140">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>Department</Th>
            <Th>Dept code</Th>
            <Th>School</Th>
            <Th>Faculty</Th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.code}>
              <Td>{department.name}</Td>
              <Td className="text-muted-foreground">{department.code}</Td>
              <Td>{department.school}</Td>
              <Td>{department.faculty}</Td>
            </tr>
          ))}
        </tbody>
      </Grid>
    </Panel>
  )
}
