import { useState } from 'react'
import { useApplyChanges, useLookupVersions, type ChangesApplied } from '@/api/admin-lookups'
import { Grid, Panel, Td, Th } from '@/components/shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { asPercent, PERCENT_CONSTANTS } from '@/lib/format/constants'
import { cn } from '@/lib/utils'
import { RATE_TABLES, type RateTableSpec, type ValueField } from './rateTables'
import {
  countText,
  idOf,
  keyOf,
  keyText,
  shown,
  stagedId,
  toRequest,
  updateOf,
  upsert,
  valuesOf,
  without,
  type Key,
  type Row,
  type Staged,
  type Values,
} from './stagedChanges'
import type { RatesMoved } from './VersionsPanel'

export type Refused = { id: string; message: string } | null

/** One rate table, with every change staged against it marked (#138). */
export function RateTable({
  spec,
  rows,
  staged,
  refused,
  onStage,
}: {
  spec: RateTableSpec
  rows: Row[]
  staged: Staged[]
  refused: Refused
  onStage: (next: Staged[]) => void
}) {
  const ofTable = staged.filter((change) => change.table === spec.id)
  const added = ofTable.filter((change) => change.op === 'create')

  return (
    <Grid>
      <thead>
        <tr>
          {spec.key.map((k) => (
            <Th key={k.field}>{k.label}</Th>
          ))}
          {spec.values.map((v) => (
            <Th key={v.field} className={cn(v.kind === 'number' && 'text-right')}>
              {v.label}
            </Th>
          ))}
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = keyOf(spec, row)
          const id = stagedId(spec.id, key)
          const saved = valuesOf(spec, row)
          const change = ofTable.find((existing) => idOf(existing) === id)
          return (
            <RateRow
              key={id}
              spec={spec}
              rowKey={key}
              about={spec.about?.(row)}
              values={change?.op === 'update' ? { ...saved, ...change.value } : saved}
              was={change?.op === 'update' ? change.was : null}
              removed={change?.op === 'delete'}
              refusal={refused?.id === id ? refused.message : null}
              onChange={(edited) => {
                const update = updateOf(spec, key, saved, edited)
                onStage(update ? upsert(staged, update) : without(staged, id))
              }}
              onRemove={
                spec.removable === false
                  ? undefined
                  : () => onStage(upsert(staged, { op: 'delete', table: spec.id, key, was: saved }))
              }
              onUndo={() => onStage(without(staged, id))}
            />
          )
        })}
        {added.map((change) => {
          const id = idOf(change)
          return (
            <RateRow
              key={`new-${id}`}
              spec={spec}
              rowKey={change.key}
              values={change.value}
              added
              refusal={refused?.id === id ? refused.message : null}
              onChange={(value) => onStage(upsert(staged, { ...change, value }))}
              onUndo={() => onStage(without(staged, id))}
            />
          )
        })}
      </tbody>
    </Grid>
  )
}

function RateRow({
  spec,
  rowKey,
  about,
  values,
  was = null,
  added = false,
  removed = false,
  refusal,
  onChange,
  onRemove,
  onUndo,
}: {
  spec: RateTableSpec
  rowKey: Key
  about?: { name: string; detail?: string }
  values: Values
  was?: Values | null
  added?: boolean
  removed?: boolean
  refusal: string | null
  onChange: (values: Values) => void
  onRemove?: () => void
  onUndo: () => void
}) {
  const name = keyText(spec, rowKey)
  const changed = was !== null || added || removed

  return (
    <tr
      className={cn(
        changed && 'bg-amber-50',
        removed && 'text-muted-foreground',
        refusal && 'bg-destructive/10',
      )}
      aria-invalid={refusal ? true : undefined}
    >
      {spec.key.map((k, i) => (
        <Td key={k.field}>
          {about && i === 0 ? (
            <div className="max-w-[46ch] py-0.5 whitespace-normal">
              <div className="font-medium">{about.name}</div>
              {about.detail && <div className="text-[12px] text-muted-foreground">{about.detail}</div>}
            </div>
          ) : (
            <span className={cn(removed && 'line-through')}>
              {rowKey[k.field] === null || rowKey[k.field] === '' ? '—' : String(rowKey[k.field])}
            </span>
          )}
          {i === 0 && added && <Badge variant="secondary" className="ml-2">New</Badge>}
          {i === 0 && removed && <Badge variant="destructive" className="ml-2">Removed</Badge>}
          {i === 0 && refusal && <div className="mt-0.5 text-[12px] text-destructive">{refusal}</div>}
        </Td>
      ))}
      {spec.values.map((field) => (
        <Td key={field.field} className={cn(field.kind === 'number' && 'text-right')}>
          {removed ? (
            <span className="tabular line-through">{shown(field, values[field.field])}</span>
          ) : (
            <ValueInput
              field={field}
              value={values[field.field]}
              constant={String(rowKey.name ?? '')}
              label={`${field.label} for ${name}`}
              onChange={(value) => onChange({ ...values, [field.field]: value })}
            />
          )}
          {was && field.field in was && (
            <div className="tabular mt-0.5 text-[11.5px] text-muted-foreground">
              was {shown(field, was[field.field])}
            </div>
          )}
        </Td>
      ))}
      <Td className="w-40">
        {changed ? (
          <Button size="sm" variant="ghost" onClick={onUndo} aria-label={`Undo the change to ${name}`}>
            Undo
          </Button>
        ) : (
          onRemove && (
            <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${name}`}>
              Remove
            </Button>
          )
        )}
      </Td>
    </tr>
  )
}

function ValueInput({
  field,
  value,
  constant,
  label,
  onChange,
}: {
  field: ValueField
  value: unknown
  /** The constant's name, for a `constant` field. */
  constant: string
  label: string
  onChange: (value: unknown) => void
}) {
  switch (field.kind) {
    case 'constant':
      return <ConstantInput name={constant} value={Number(value)} label={label} onChange={onChange} />
    case 'number':
      return (
        <NumberInput
          className="tabular ml-auto h-8 w-36 text-right"
          step={field.step}
          min={0}
          value={Number(value)}
          onChange={onChange}
          aria-label={label}
        />
      )
    case 'text':
      return (
        <Input
          className="h-8 min-w-48"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
      )
    case 'boolean':
      return <Checkbox checked={Boolean(value)} onCheckedChange={(next) => onChange(next === true)} aria-label={label} />
  }
}

/**
 * What was typed into a constant, read as a value (#151): a decimal, or for a
 * rate a percentage such as `30%`, which is its decimal. Input reading only:
 * whether the value is in range is the server's to say when the set is saved,
 * and it says so against the row.
 */
function readConstant(raw: string, percent: boolean): { value?: number; error?: string } {
  const typed = raw.trim()
  if (typed === '') return { error: 'Enter a value.' }
  if (typed.endsWith('%')) {
    if (!percent) return { error: 'Enter this as a number, not a percentage.' }
    const number = Number(typed.slice(0, -1).trim())
    if (!Number.isFinite(number)) return { error: 'Enter a decimal such as 0.30, or a percentage such as 30%.' }
    return { value: Number((number / 100).toFixed(8)) }
  }
  const number = Number(typed)
  if (!Number.isFinite(number)) {
    return { error: percent ? 'Enter a decimal such as 0.30, or a percentage such as 30%.' : 'Enter a number.' }
  }
  return { value: number }
}

function ConstantInput({
  name,
  value,
  label,
  onChange,
}: {
  name: string
  value: number
  label: string
  onChange: (value: number) => void
}) {
  const percent = PERCENT_CONSTANTS.has(name)
  // What is being typed, held while the field has focus so "30%" isn't
  // rewritten as 0.3 under the cursor.
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid justify-items-end gap-0.5">
      <div className="flex items-center gap-2">
        <Input
          className="tabular h-8 w-32 text-right"
          inputMode="decimal"
          value={draft ?? String(value)}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          onFocus={() => setDraft(String(value))}
          onChange={(event) => {
            setDraft(event.target.value)
            const read = readConstant(event.target.value, percent)
            setError(read.error ?? null)
            if (read.value !== undefined) onChange(read.value)
          }}
          onBlur={() => {
            if (!error) setDraft(null)
          }}
        />
        {percent && <span className="tabular w-20 text-left text-muted-foreground">= {asPercent(value)}</span>}
      </div>
      {error && <span className="text-[12px] text-destructive">{error}</span>}
    </div>
  )
}

/** A new row, held with the rest of the set until it is saved. */
export function AddRateRow({ spec, onAdd }: { spec: RateTableSpec; onAdd: (key: Key, values: Values) => void }) {
  const blank = (): Record<string, string | boolean> =>
    Object.fromEntries([
      ...spec.key.map((k) => [k.field, '']),
      ...spec.values.map((v) => [v.field, v.kind === 'boolean' ? false : '']),
    ])
  const [entered, setEntered] = useState(blank)
  const ready =
    spec.key.every((k) => k.kind === 'number' || String(entered[k.field]).trim()) &&
    spec.values.every((v) => v.kind === 'boolean' || entered[v.field] !== '')

  const add = () => {
    const key: Key = {}
    for (const k of spec.key) {
      const raw = String(entered[k.field]).trim()
      key[k.field] = k.kind === 'number' ? (raw === '' ? null : Number(raw)) : raw || null
    }
    const values: Values = {}
    for (const v of spec.values) {
      const raw = entered[v.field]
      values[v.field] = v.kind === 'number' ? Number(raw) : v.kind === 'text' ? String(raw).trim() : raw
    }
    onAdd(key, values)
    setEntered(blank())
  }

  const fields = [...spec.key, ...spec.values]
  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-[13px] font-medium">Add a row</div>
      <div className="flex flex-wrap items-end gap-3">
        {fields.map((f) =>
          f.kind === 'boolean' ? (
            <label key={f.field} className="flex h-8 items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={entered[f.field] === true}
                onCheckedChange={(next) => setEntered({ ...entered, [f.field]: next === true })}
              />
              {f.label}
            </label>
          ) : (
            <label key={f.field} className="grid gap-1 text-[12px] text-muted-foreground">
              {f.label}
              <Input
                className="h-8 w-40"
                type={f.kind === 'number' ? 'number' : 'text'}
                value={String(entered[f.field])}
                onChange={(event) => setEntered({ ...entered, [f.field]: event.target.value })}
              />
            </label>
          ),
        )}
        <Button size="sm" variant="outline" disabled={!ready} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  )
}

export function ChangeBar({
  staged,
  onDiscard,
  onReview,
}: {
  staged: Staged[]
  onDiscard: () => void
  onReview: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-[13px] shadow-lg"
    >
      <span className="font-medium">{countText(staged)}</span>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard all
        </Button>
        <Button size="sm" onClick={onReview}>
          Review changes
        </Button>
      </div>
    </div>
  )
}

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
      { onSuccess: (saved) => onSaved(saved, staged.length), onError: onRefused },
    )

  return (
    <Panel title="Review changes" className="mt-4" description={countText(staged)}>
      <div className="grid gap-4">
        {RATE_TABLES.filter((spec) => staged.some((change) => change.table === spec.id)).map((spec) => (
          <section key={spec.id} aria-label={spec.label}>
            <h4 className="mb-1 text-[13px] font-semibold">{spec.label}</h4>
            <ul className="grid gap-1 text-[13px]">
              {staged
                .filter((change) => change.table === spec.id)
                .map((change) => (
                  <li key={idOf(change)} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{keyText(spec, change.key)}</span>
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
              : `Starts a new version: costings are already priced on version #${current.id}, and they keep those rates.`}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" disabled={apply.isPending} onClick={save}>
            {apply.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button size="sm" variant="ghost" disabled={apply.isPending} onClick={onBack}>
            Keep editing
          </Button>
        </div>
      </div>
    </Panel>
  )
}

const signedPercent = (fraction: number) =>
  `${fraction > 0 ? '+' : fraction < 0 ? '−' : ''}${Math.abs(fraction * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%`

function ChangeText({ spec, change }: { spec: RateTableSpec; change: Staged }) {
  const fields = spec.values.filter((v) => change.op === 'delete' || v.field in change.value)
  // A rate constant reads as a percentage here, as it does beside its input.
  const percent = PERCENT_CONSTANTS.has(String(change.key.name ?? ''))
  const show = (field: ValueField, value: unknown) =>
    percent && field.kind === 'constant' ? asPercent(Number(value)) : shown(field, value)
  switch (change.op) {
    case 'update':
      return (
        <span className="tabular flex flex-wrap gap-x-3">
          {fields.map((field) => {
            const was = change.was[field.field]
            const now = change.value[field.field]
            return (
              <span key={field.field}>
                {field.label} {show(field, was)} → {show(field, now)}
                {/* Shown so a slip of the keyboard (a rate 100 times too big) stands out. */}
                {(field.kind === 'number' || field.kind === 'constant') && Number(was) !== 0 && (
                  <span className="ml-1.5 text-muted-foreground">
                    ({signedPercent(Number(now) / Number(was) - 1)})
                  </span>
                )}
              </span>
            )
          })}
        </span>
      )
    case 'create':
      return (
        <span className="tabular">
          <Badge variant="secondary">Added</Badge>{' '}
          {fields.map((field) => `${field.label} ${shown(field, change.value[field.field])}`).join(' · ')}
        </span>
      )
    case 'delete':
      return (
        <span className="tabular">
          <Badge variant="destructive">Removed</Badge> was{' '}
          {fields.map((field) => shown(field, change.was[field.field])).join(' · ')}
        </span>
      )
  }
}

/**
 * What a save or a restore did to the rates, and who was priced on the version
 * they moved away from (#142). Those costings keep their rates; this says what
 * can be done about each.
 */
export function RatesMovedNotice({
  moved,
  onSee,
  onDismiss,
}: {
  moved: RatesMoved
  onSee: (versionId: number) => void
  onDismiss: () => void
}) {
  const replaced = moved.replaced
  const affected = replaced ? replaced.in_review + replaced.approved : 0
  const costings = (n: number) => `${n} ${n === 1 ? 'costing' : 'costings'}`

  return (
    <Alert className="mb-4" role="status">
      <AlertTitle>{moved.title}</AlertTitle>
      <AlertDescription>
        <p>{moved.description}</p>
        {replaced && affected === 0 && (
          <p>No costing in review or approved was priced on version #{replaced.version_id}, the version replaced.</p>
        )}
        {replaced && affected > 0 && (
          <div className="mt-2 grid gap-1">
            <p>Priced on version #{replaced.version_id}, the version replaced:</p>
            <ul className="ml-4 list-disc">
              {replaced.in_review > 0 && (
                <li>
                  {costings(replaced.in_review)} in review: the approver can reject it, giving
                  the rates as the reason (“Rates changed since this was submitted: please
                  make a new draft from it and resubmit”). The new draft takes the current rates.
                </li>
              )}
              {replaced.approved > 0 && (
                <li>
                  {costings(replaced.approved)} approved: the price is final and does not
                  change.
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="mt-2 flex gap-2">
          {replaced && affected > 0 && (
            <Button size="sm" variant="outline" onClick={() => onSee(replaced.version_id)}>
              See them
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
