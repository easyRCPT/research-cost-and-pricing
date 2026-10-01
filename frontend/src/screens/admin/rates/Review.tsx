import { useState } from 'react'
import {
  useApplyChanges,
  useLookupVersions,
  type ChangesApplied,
} from '@/api/admin-lookups'
import { Panel } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RATE_TABLES } from '@/screens/admin/rateTables'
import {
  countText,
  idOf,
  keyText,
  toRequest,
  type Staged,
} from '@/screens/admin/stagedChanges'
import { ChangeText } from './ChangeText'

/** Every change, old → new, and where the set will go, before it is saved. */
export function Review({
  staged,
  warnings = [],
  onBack,
  onSaved,
  onRefused,
}: {
  staged: Staged[]
  /** Things worth knowing before saving that are not refusals. */
  warnings?: string[]
  onBack: () => void
  onSaved: (saved: ChangesApplied, count: number) => void
  onRefused: (error: unknown) => void
}) {
  const apply = useApplyChanges()
  const { data: versions } = useLookupVersions()
  const [note, setNote] = useState('')
  const current = versions.find((version) => version.current)

  const save = () =>
    apply.mutate(
      { note: note.trim(), changes: staged.map(toRequest) },
      {
        onSuccess: (saved) => onSaved(saved, staged.length),
        onError: onRefused,
      },
    )

  return (
    <Panel
      title="Review changes"
      className="mt-4"
      description={countText(staged)}
    >
      <div className="grid gap-4">
        {RATE_TABLES.filter((spec) =>
          staged.some((change) => change.table === spec.id),
        ).map((spec) => (
          <section key={spec.id} aria-label={spec.label}>
            <h4 className="mb-1 text-[13px] font-semibold">{spec.label}</h4>
            <ul className="grid gap-1 text-[13px]">
              {staged
                .filter((change) => change.table === spec.id)
                .map((change) => (
                  <li key={idOf(change)} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">
                      {keyText(spec, change.key)}
                    </span>
                    <ChangeText spec={spec} change={change} />
                  </li>
                ))}
            </ul>
          </section>
        ))}

        <label className="grid max-w-xl gap-1 text-[12.5px] text-muted-foreground">
          Note (optional)
          <Input
            value={note}
            maxLength={200}
            placeholder="For example, 2027 EBA increase"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        {warnings.map((warning) => (
          <Alert key={warning} className="border-warn/40 bg-warn-bg text-warn">
            <AlertDescription className="text-warn">{warning}</AlertDescription>
          </Alert>
        ))}

        {current && (
          <p className="text-[13px]">
            {current.accepts_changes
              ? `Saves into version #${current.id}.`
              : current.baseline
                ? `Starts a new version: version #${current.id} is the rates as first loaded, kept as they are so they can always be restored.`
                : `Starts a new version: costings are already priced on version #${current.id}, and they keep those rates.`}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" disabled={apply.isPending} onClick={save}>
            {apply.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={apply.isPending}
            onClick={onBack}
          >
            Keep editing
          </Button>
        </div>
      </div>
    </Panel>
  )
}
