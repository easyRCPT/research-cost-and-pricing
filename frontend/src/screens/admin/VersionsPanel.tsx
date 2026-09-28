import { useState } from 'react'
import { toast } from 'sonner'
import { useLookupVersions, useRestoreVersion, type LookupVersion } from '@/api/admin-lookups'
import { Grid, Panel, Td, Th } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { shortDate } from '@/lib/format/dates'

/**
 * Every set of rates the tool has had, and a way to put one back (#137).
 *
 * Restoring copies the old set into a new version and makes that current, so
 * nothing already priced moves and the restore itself is part of the history.
 */
export function VersionsPanel() {
  const { data: versions } = useLookupVersions()

  return (
    <Panel
      title="Versions"
      description="Each saved change after a costing is submitted keeps the previous rates as a version."
      className="mt-4"
    >
      <Grid>
        <thead>
          <tr>
            <Th>Version</Th>
            <Th>Made</Th>
            <Th>By</Th>
            <Th className="text-right">Costings priced on it</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <VersionRow key={version.id} version={version} />
          ))}
        </tbody>
      </Grid>
    </Panel>
  )
}

function VersionRow({ version }: { version: LookupVersion }) {
  const restore = useRestoreVersion()
  const [confirming, setConfirming] = useState(false)

  return (
    <tr>
      <Td>
        #{version.id} {version.current && <Badge variant="secondary">Current</Badge>}
      </Td>
      <Td>{shortDate(version.created_at)}</Td>
      <Td>{version.updated_by ?? '—'}</Td>
      <Td className="tabular text-right">{version.budgets_priced}</Td>
      <Td className="w-[26rem]">
        {!version.current && !confirming && (
          <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
            Restore
          </Button>
        )}
        {confirming && (
          <div className="grid gap-2 text-[12.5px]">
            <span>
              The rates go back to how they were in version #{version.id}, as a
              new version. Costings already submitted keep their rates.
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate(version.id, {
                    onSuccess: (restored) => {
                      setConfirming(false)
                      toast.success(`Rates restored from version #${version.id}`, {
                        description: `They are now version #${restored}.`,
                      })
                    },
                    onError: (error) =>
                      toast.error('Not restored', {
                        description: error instanceof ApiError ? error.message : 'Try again.',
                      }),
                  })
                }
              >
                {restore.isPending ? 'Restoring…' : 'Restore these rates'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Td>
    </tr>
  )
}
