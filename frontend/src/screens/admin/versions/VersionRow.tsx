import { useState } from 'react'
import { toast } from 'sonner'

import { type LookupVersion, useRestoreVersion } from '@/api/admin-lookups'
import { Td } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InlineConfirm } from '@/components/ui/inline-confirm'
import { ApiError } from '@/lib/api'
import { dateTime, shortDate } from '@/lib/format/dates'

import type { RatesMoved } from './types'

export function VersionRow({
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
        #{version.id}{' '}
        {version.current && <Badge variant="secondary">Current</Badge>}{' '}
        {version.baseline && (
          <Badge
            variant="outline"
            title="The rates as first loaded, kept so they can always be restored"
          >
            As first loaded
          </Badge>
        )}
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
                  {set.change_count}{' '}
                  {set.change_count === 1 ? 'change' : 'changes'}
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
          <Button
            size="sm"
            variant="link"
            className="h-auto p-0"
            aria-expanded={shown}
            onClick={onShow}
          >
            {shown ? 'Hide' : `${version.budgets_priced} — see them`}
          </Button>
        )}
      </Td>
      <Td className="w-[26rem]">
        {!version.current && !confirming && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirming(true)}
          >
            Restore
          </Button>
        )}
        {confirming && (
          <div className="grid gap-2 text-[12.5px]">
            <span>
              The rates go back to how they were in version #{version.id}, as a
              new version. Costings already submitted keep their rates.
            </span>
            <InlineConfirm
              confirm="Restore these rates"
              pendingLabel="Restoring…"
              pending={restore.isPending}
              onConfirm={() =>
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
                      description:
                        error instanceof ApiError
                          ? error.message
                          : 'Try again.',
                    }),
                })
              }
              onCancel={() => setConfirming(false)}
            />
          </div>
        )}
      </Td>
    </tr>
  )
}
