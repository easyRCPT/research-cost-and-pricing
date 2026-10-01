import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  useLookupVersions,
  useRestoreVersion,
  useVersionBudgets,
  type LookupVersion,
  type PricedOn,
} from '@/api/admin-lookups'
import { Grid, Panel, Td, Th } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { dateTime, shortDate } from '@/lib/format/dates'
import { money } from '@/lib/format/utils'
import { STATUS_LABELS } from '@/screens/projects/status'

export interface RatesMoved {
  title: string
  description: string
  /** Who was priced on the version the rates moved away from, if they did. */
  replaced: PricedOn | null
}

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
export function VersionsPanel({ shown, onShow, onRestored }: VersionsPanelProps) {
  const { data: versions } = useLookupVersions()

  return (
    <Panel
      title="Versions"
      description="A version is the rates some costing was priced on. Saved changes go into the current version until a costing is submitted on it; the next save then starts a new one."
      className="mt-4"
    >
      <Grid>
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

function VersionRow({
  version,
  shown,
  onShow,
  onRestored,
}: {
  version: LookupVersion
  shown: boolean
  onShow: () => void
  onRestored: (moved: RatesMoved) => void
}) {
  const restore = useRestoreVersion()
  const [confirming, setConfirming] = useState(false)

  return (
    <tr id={`version-${version.id}`} className="align-top">
      <Td className="whitespace-nowrap">
        #{version.id} {version.current && <Badge variant="secondary">Current</Badge>}
      </Td>
      <Td className="whitespace-nowrap">{shortDate(version.created_at)}</Td>
      <Td>{version.updated_by ?? '—'}</Td>
      <Td className="min-w-72">
        {version.change_sets.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <ul className="grid gap-1 py-0.5">
            {version.change_sets.map((set) => (
              <li key={set.id}>
                <span className="font-medium">{set.note || 'No note'}</span>
                <span className="text-muted-foreground">
                  {' · '}
                  {set.change_count} {set.change_count === 1 ? 'change' : 'changes'}
                  {' · '}
                  {set.saved_by ?? 'System'} · {dateTime(set.saved_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Td>
      <Td className="tabular text-right">
        {version.budgets_priced === 0 ? (
          0
        ) : (
          <Button size="sm" variant="link" className="h-auto p-0" aria-expanded={shown} onClick={onShow}>
            {shown ? 'Hide' : `${version.budgets_priced} — see them`}
          </Button>
        )}
      </Td>
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
                      onRestored({
                        title: `Rates restored from version #${version.id}`,
                        description: `They are now version #${restored.version_id}.`,
                        replaced: restored.replaced,
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

/** The costings stamped with one version, each opening the costing (#142). */
function VersionBudgets({ versionId }: { versionId: number }) {
  const { data: budgets, isPending, isError } = useVersionBudgets(versionId)

  if (isPending) return <div className="h-6 animate-pulse rounded bg-muted" role="status" aria-label="Loading costings" />
  if (isError) return <p className="text-destructive">The costings on this version could not be loaded.</p>

  return (
    <table className="w-full text-[13px]" aria-label={`Costings priced on version #${versionId}`}>
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-1 pr-3 font-medium">Reference</th>
          <th className="py-1 pr-3 font-medium">Title</th>
          <th className="py-1 pr-3 font-medium">Owner</th>
          <th className="py-1 pr-3 font-medium">Status</th>
          <th className="py-1 pr-3 text-right font-medium">Price (inc. GST)</th>
          <th className="py-1 font-medium">Submitted</th>
        </tr>
      </thead>
      <tbody>
        {budgets.map((budget) => (
          <tr key={budget.id} className="border-t">
            <td className="py-1 pr-3 whitespace-nowrap">{budget.reference ?? '—'}</td>
            <td className="py-1 pr-3">
              <Link
                to="/projects/$projectId/$screen"
                params={{ projectId: budget.project_id, screen: 'details' }}
                className="font-medium text-primary hover:underline"
              >
                {budget.title || 'Untitled'}
              </Link>
            </td>
            <td className="py-1 pr-3">{budget.owner.name || budget.owner.email}</td>
            <td className="py-1 pr-3">{STATUS_LABELS[budget.status]}</td>
            <td className="tabular py-1 pr-3 text-right">{money(budget.total_price_inc_gst)}</td>
            <td className="py-1 whitespace-nowrap">{budget.submitted_at ? shortDate(budget.submitted_at) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
