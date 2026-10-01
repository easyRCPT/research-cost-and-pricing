import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminProjects } from '@/api/admin-console'
import { useReferenceWrite } from '@/api/admin-lookups'
import { Grid, Panel, Td, Th } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ReferenceField, ReferenceTableSpec } from './referenceTables'

type Row = Record<string, unknown>
type Faculty = { code: string; name: string }
type Refusal = { message: string; fields: Record<string, string> }

const refusalOf = (error: unknown): Refusal =>
  error instanceof ApiError
    ? { message: error.message, fields: error.fields }
    : { message: 'Not saved. Try again.', fields: {} }

// A wide table scrolls sideways, and the row's name and its buttons (or the
// question a save is asking) must stay in view while it does.
const PIN_LEFT = 'sticky left-0 z-[1]'
const PIN_RIGHT = 'sticky right-0 z-[1]'

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value))

/**
 * A reference table (#70, #144): rows that don't price a costing, saved one
 * at a time and changed in place. No set and no rates version: the panel says
 * so, so nobody waits for one. A key (a code, a ledger ID) is what other
 * records point at, so it is entered once and never edited.
 */
export function ReferenceTableEditor({
  spec,
  rows,
  faculties,
}: {
  spec: ReferenceTableSpec
  rows: Row[]
  faculties: Faculty[]
}) {
  return (
    <Panel
      title={spec.label}
      description="A reference table: each row is saved on its own and changed in place. It doesn't price a costing, so no rates version is made."
    >
      <Grid>
        <thead>
          <tr>
            <Th className={PIN_LEFT}>{spec.key.label}</Th>
            {spec.fields.map((f) => (
              <Th key={f.field}>{f.label}</Th>
            ))}
            <Th className={PIN_RIGHT} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ReferenceRow key={text(row[spec.key.field])} spec={spec} row={row} faculties={faculties} />
          ))}
        </tbody>
      </Grid>
      <AddReferenceRow key={spec.id} spec={spec} faculties={faculties} />
    </Panel>
  )
}

type Mode = 'view' | 'edit' | 'move' | 'remove'

function ReferenceRow({ spec, row, faculties }: { spec: ReferenceTableSpec; row: Row; faculties: Faculty[] }) {
  const write = useReferenceWrite()
  const key = text(row[spec.key.field])
  const saved = Object.fromEntries(spec.fields.map((f) => [f.field, text(row[f.field])]))
  const [mode, setMode] = useState<Mode>('view')
  const [draft, setDraft] = useState(saved)
  const [refusal, setRefusal] = useState<Refusal | null>(null)

  const changed = spec.fields.filter((f) => draft[f.field] !== saved[f.field])
  const renamed = changed.some((f) => f.named)
  const moving = changed.some((f) => f.kind === 'faculty')
  const facultyName = (code: string) => faculties.find((f) => f.code === code)?.name ?? code

  const cancel = () => {
    setDraft(saved)
    setRefusal(null)
    setMode('view')
  }

  const save = () =>
    write.mutate(
      {
        op: 'update',
        table: spec.id,
        lookup: { [spec.key.field]: row[spec.key.field] },
        values: Object.fromEntries(changed.map((f) => [f.field, draft[f.field]])),
      },
      {
        onSuccess: () => {
          setRefusal(null)
          setMode('view')
          toast.success('Saved', { description: `${spec.label}: ${key}` })
        },
        onError: (error) => {
          setRefusal(refusalOf(error))
          setMode('edit')
        },
      },
    )

  const remove = () =>
    write.mutate(
      { op: 'delete', table: spec.id, key },
      {
        onSuccess: () => toast.success('Removed', { description: `${spec.label}: ${key}` }),
        onError: (error) => {
          setRefusal(refusalOf(error))
          setMode('view')
        },
      },
    )

  const editing = mode !== 'view' && mode !== 'remove'

  return (
    <tr className="align-top">
      <Td className={cn(PIN_LEFT, 'whitespace-nowrap font-medium', editing ? 'bg-amber-50' : 'bg-card')}>{key}</Td>
      {spec.fields.map((f) => (
        <Td key={f.field} className={cn(editing && 'bg-amber-50')}>
          {editing ? (
            <FieldInput
              field={f}
              value={draft[f.field]}
              faculties={faculties}
              label={`${f.label} for ${key}`}
              error={refusal?.fields[f.field] ?? (f.kind === 'faculty' ? refusal?.fields.faculty : undefined)}
              onChange={(value) => setDraft({ ...draft, [f.field]: value })}
            />
          ) : f.kind === 'faculty' ? (
            text(row.faculty) || facultyName(saved[f.field])
          ) : (
            saved[f.field] || '—'
          )}
        </Td>
      ))}
      <Td className={cn(PIN_RIGHT, 'w-[22rem] min-w-[16rem]', editing ? 'bg-amber-50' : 'bg-card')}>
        {mode === 'view' && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode('edit')} aria-label={`Edit ${key}`}>
              Edit
            </Button>
            {spec.removable && (
              <Button size="sm" variant="ghost" onClick={() => setMode('remove')} aria-label={`Remove ${key}`}>
                Remove
              </Button>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <div className="grid gap-2 text-[12.5px]">
            {renamed && (
              <p className="text-muted-foreground">
                Costings already approved will show the new name: names aren't versioned. The audit
                log keeps the old one.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={changed.length === 0 || write.isPending}
                onClick={() => (moving ? setMode('move') : save())}
              >
                {write.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" disabled={write.isPending} onClick={cancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {mode === 'move' && (
          <MoveConfirm
            department={key}
            to={facultyName(draft.faculty_code)}
            pending={write.isPending}
            onConfirm={save}
            onCancel={() => setMode('edit')}
          />
        )}

        {mode === 'remove' && (
          <div role="alert" className="grid gap-2 text-[12.5px]">
            <span>
              Remove {spec.noun} {key}? Nothing can use it afterwards.
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" disabled={write.isPending} onClick={remove}>
                Remove
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('view')}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {refusal && mode !== 'edit' && <p className="mt-1 text-[12.5px] text-destructive">{refusal.message}</p>}
        {refusal && mode === 'edit' && Object.keys(refusal.fields).length === 0 && (
          <p className="mt-1 text-[12.5px] text-destructive">{refusal.message}</p>
        )}
      </Td>
    </tr>
  )
}

/**
 * Moving a department moves its costings waiting on a dean to the new
 * faculty's dean: the dean queue reads the department's faculty when it is
 * asked, not at submission (#70). So the move says how many first.
 */
function MoveConfirm({
  department,
  to,
  pending,
  onConfirm,
  onCancel,
}: {
  department: string
  to: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { data: projects, isPending } = useAdminProjects()
  const waiting = (projects ?? []).filter(
    (project) => project.department_code === department && project.status === 'dean_review',
  ).length

  return (
    <div role="alert" className="grid gap-2 text-[12.5px]">
      <span className="font-medium">Move {department} to {to}?</span>
      <span>
        {isPending
          ? 'Counting the costings waiting on a dean…'
          : waiting === 0
            ? 'No costing from this department is waiting on a dean.'
            : `${waiting} ${waiting === 1 ? 'costing' : 'costings'} waiting on a dean will go to the dean of ${to} instead.`}
      </span>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending || isPending} onClick={onConfirm}>
          {pending ? 'Moving…' : 'Move'}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={onCancel}>
          Back
        </Button>
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  faculties,
  label,
  error,
  onChange,
}: {
  field: ReferenceField
  value: string
  faculties: Faculty[]
  label: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-0.5">
      {field.kind === 'faculty' ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger size="sm" className="min-w-56 bg-white" aria-label={label} aria-invalid={!!error}>
            <SelectValue placeholder="Pick a faculty" />
          </SelectTrigger>
          <SelectContent>
            {faculties.map((faculty) => (
              <SelectItem key={faculty.code} value={faculty.code}>
                {faculty.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className="h-8 min-w-40"
          type={field.kind === 'number' ? 'number' : 'text'}
          value={value}
          aria-label={label}
          aria-invalid={!!error}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error && <span className="text-[12px] text-destructive">{error}</span>}
    </div>
  )
}

function AddReferenceRow({ spec, faculties }: { spec: ReferenceTableSpec; faculties: Faculty[] }) {
  const write = useReferenceWrite()
  const blank = () => Object.fromEntries([spec.key, ...spec.fields].map((f) => [f.field, '']))
  const [values, setValues] = useState<Record<string, string>>(blank)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const ready = values[spec.key.field].trim() !== ''

  const add = () => {
    const submitted = values
    write.mutate(
      {
        op: 'create',
        table: spec.id,
        values: Object.fromEntries(Object.entries(submitted).map(([field, value]) => [field, value.trim()])),
      },
      {
        onSuccess: () => {
          toast.success(`${spec.noun[0].toUpperCase()}${spec.noun.slice(1)} added`, {
            description: submitted[spec.key.field],
          })
          // Success lands once the list has caught up, by which time the next
          // row may be half typed: clear only what was sent.
          setValues((current) => (current === submitted ? blank() : current))
          setRefusal(null)
        },
        onError: (error) => setRefusal(refusalOf(error)),
      },
    )
  }

  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-2 text-[13px] font-medium">Add {spec.noun === 'activity' ? 'an' : 'a'} {spec.noun}</div>
      <div className="flex flex-wrap items-start gap-3">
        {[spec.key, ...spec.fields].map((f) => (
          <label key={f.field} className="grid gap-1 text-[12px] text-muted-foreground">
            {f.label}
            <FieldInput
              field={f}
              value={values[f.field]}
              faculties={faculties}
              label={f.label}
              error={refusal?.fields[f.field] ?? (f.kind === 'faculty' ? refusal?.fields.faculty : undefined)}
              onChange={(value) => setValues({ ...values, [f.field]: value })}
            />
          </label>
        ))}
        <Button size="sm" variant="outline" className="mt-5" disabled={!ready || write.isPending} onClick={add}>
          {write.isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {refusal && Object.keys(refusal.fields).length === 0 && (
        <p className="mt-2 text-[12.5px] text-destructive">{refusal.message}</p>
      )}
    </div>
  )
}
