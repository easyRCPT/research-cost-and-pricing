import { Fragment } from 'react'

import { useLookupVersions } from '@/api/admin-lookups'
import { Grid, Panel, Td, Th } from '@/components/shell'

import type { RatesMoved } from './types'
import { VersionBudgets } from './VersionBudgets'
import { VersionRow } from './VersionRow'

interface VersionsPanelProps {
  /** The version whose costings are listed, if any. */
  shown: number | null
  onShow: (versionId: number | null) => void
  onRestored: (moved: RatesMoved) => void
}

/**
 * Every set of rates the tool has had, the changes saved into each, and a way
 * to put one back (#137, #138).
 *
 * Restoring copies the old set into a new version and makes that current, so
 * nothing already priced moves and the restore itself is part of the history.
 */
export function VersionsPanel({
  shown,
  onShow,
  onRestored,
}: VersionsPanelProps) {
  const { data: versions } = useLookupVersions()

  return (
    <Panel>
      {/* The page scrolls, not the table. */}
      <Grid className="max-h-none overflow-auto">
        <thead>
          <tr>
            <Th>Version</Th>
            <Th>Made</Th>
            <Th>By</Th>
            <Th>Changes saved into it</Th>
            <Th className="text-right">Costings priced on it</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <Fragment key={version.id}>
              <VersionRow
                version={version}
                shown={shown === version.id}
                onShow={() => onShow(shown === version.id ? null : version.id)}
                onRestored={onRestored}
              />
              {shown === version.id && (
                <tr>
                  <Td colSpan={6} className="bg-muted/30 p-3">
                    <VersionBudgets versionId={version.id} />
                  </Td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </Grid>
    </Panel>
  )
}
