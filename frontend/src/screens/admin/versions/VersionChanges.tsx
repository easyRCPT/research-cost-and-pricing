import { useVersionChanges, type VersionChangeSet } from '@/api/admin-lookups'
import { Skeleton } from '@/components/ui/skeleton'
import { dateTime } from '@/lib/format/dates'

import { ChangeChip } from './ChangeChip'
import { type ChangeLine, changeLine } from './changeLines'
import { ChangeTally } from './ChangeTally'
import { Disclosure } from './Disclosure'

function ChangeFigures({ line }: { line: ChangeLine }) {
  if (line.figures.length === 0)
    return <p className="py-1 text-muted-foreground">No figures recorded.</p>

  return (
    <table
      className="mb-2 w-full table-fixed text-[13px]"
      aria-label={`Figures changed on ${line.name}`}
    >
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="w-1/2 py-1 pr-3 font-medium">Field</th>
          <th className="py-1 pr-3 text-right font-medium">Before</th>
          <th className="py-1 text-right font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {line.figures.map((figure) => (
          <tr key={figure.field} className="border-t">
            <td className="py-1 pr-3">{figure.field}</td>
            <td className="tabular py-1 pr-3 text-right text-muted-foreground">
              {figure.before}
            </td>
            <td className="tabular py-1 text-right font-medium">
              {figure.after}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ChangeItem({ line }: { line: ChangeLine }) {
  return (
    <Disclosure
      title={
        <span className="flex items-center gap-2">
          <ChangeChip op={line.op} />
          {line.name}
        </span>
      }
    >
      <ChangeFigures line={line} />
    </Disclosure>
  )
}

function ChangeSetItem({ set }: { set: VersionChangeSet }) {
  const lines = set.changes.map(changeLine)

  return (
    <Disclosure
      title={
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{set.note || 'No note'}</span>
          <span className="text-muted-foreground">
            {set.saved_by_name ?? 'System'} · {dateTime(set.saved_at)}
          </span>
          <ChangeTally changes={set.changes} count={set.change_count} />
        </span>
      }
    >
      {lines.length === 0 ? (
        <p className="py-1 text-muted-foreground">
          What changed was not recorded for this save.
        </p>
      ) : (
        lines.map((line) => <ChangeItem key={line.id} line={line} />)
      )}
    </Disclosure>
  )
}

/** What each set saved into one version changed, newest set first. */
export function VersionChanges({ versionId }: { versionId: number }) {
  const { data: sets, isPending, isError } = useVersionChanges(versionId)

  if (isPending)
    return (
      <Skeleton className="h-6" role="status" aria-label="Loading changes" />
    )
  if (isError)
    return (
      <p className="text-destructive">
        The changes in this version could not be loaded.
      </p>
    )
  if (sets.length === 0)
    return (
      <p className="text-muted-foreground">
        No changes were saved into this version.
      </p>
    )

  return (
    <div className="divide-y">
      {sets.map((set) => (
        <ChangeSetItem key={set.id} set={set} />
      ))}
    </div>
  )
}
