import { Link } from '@tanstack/react-router'

import { useApproverGaps } from '@/api/admin-console'
import { Grid, Panel, Td, Th } from '@/components/shell'
import { shortDate } from '@/lib/format/dates'
import { LINK } from '@/screens/admin/overview/links'

/**
 * Costings waiting on a role nobody holds (#121). Routing is strict, so they
 * reach no queue; this is where they are seen, by the people who can assign
 * someone. Shown only when there are any.
 */
export function Stranded() {
  const { data } = useApproverGaps()
  const rows = data?.stranded ?? []
  if (rows.length === 0) return null

  return (
    <Panel
      title={`${rows.length} ${rows.length === 1 ? 'costing is' : 'costings are'} waiting on nobody`}
      description="Each is waiting on a role nobody holds, so it reaches no approver's queue. Assigning someone sends it to them with nothing else to do."
      className="mb-4 border-destructive/40"
    >
      <Grid>
        <thead>
          <tr>
            <Th>Costing</Th>
            <Th>Waiting on</Th>
            <Th>Owner</Th>
            <Th align="right">Submitted</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.budget_id}>
              <Td>
                <Link
                  to="/projects/$projectId/$screen"
                  params={{ projectId: row.project_id, screen: 'approvals' }}
                  className={LINK}
                >
                  {row.title || 'Untitled'}
                </Link>
                {row.reference && (
                  <span className="ml-2 text-muted-foreground">
                    {row.reference}
                  </span>
                )}
              </Td>
              <Td>
                {row.unit} has no{' '}
                {row.level === 'department' ? 'head of department' : 'dean'}
              </Td>
              <Td>{row.owner}</Td>
              <Td align="right" className="whitespace-nowrap">
                {row.submitted_at ? shortDate(row.submitted_at) : '—'}
              </Td>
            </tr>
          ))}
        </tbody>
      </Grid>
      <p className="mt-3 text-[12.5px]">
        <Link to="/admin/users" className={LINK}>
          Assign an approver
        </Link>
      </p>
    </Panel>
  )
}
