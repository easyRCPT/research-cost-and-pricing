import { Link } from '@tanstack/react-router'

import type { Overview } from '@/api/admin-console'
import { Grid, Panel, Td, Th } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { shortDate } from '@/lib/format/dates'
import { Block } from '@/screens/admin/overview/Block'
import { LINK } from '@/screens/admin/overview/links'

export function VersionsSummary({
  versions,
  loading,
}: {
  versions: Overview['versions'] | undefined
  loading: boolean
}) {
  return (
    <Panel
      title="Lookup versions"
      description="Each version is a whole set of rates. A submitted costing keeps the version it was priced on."
      className="mb-4"
    >
      {loading ? (
        <Block />
      ) : (
        <Grid>
          <thead>
            <tr>
              <Th>Version</Th>
              <Th>Made</Th>
              <Th>By</Th>
              <Th align="right">Costings priced on it</Th>
            </tr>
          </thead>
          <tbody>
            {versions?.latest.map((version) => (
              <tr key={version.id}>
                <Td>
                  #{version.id}{' '}
                  {version.current && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                </Td>
                <Td>{shortDate(version.created_at)}</Td>
                <Td>{version.updated_by ?? '—'}</Td>
                <Td align="right" className="tabular">
                  {version.budgets_priced}
                </Td>
              </tr>
            ))}
          </tbody>
        </Grid>
      )}
      <p className="mt-3 text-[12.5px]">
        <Link to="/admin/versions" className={LINK}>
          {versions && versions.total > versions.latest.length
            ? `All ${versions.total} versions`
            : 'Restore an older version'}
        </Link>
      </p>
    </Panel>
  )
}
