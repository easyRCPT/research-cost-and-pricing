import { useState } from 'react'
import { toast } from 'sonner'

import { useReferenceWrite } from '@/api/admin-lookups'
import { Td } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EditActions } from '@/screens/admin/reference/EditActions'
import { FieldInput } from '@/screens/admin/reference/FieldInput'
import { MoveConfirm } from '@/screens/admin/reference/MoveConfirm'
import { RemoveConfirm } from '@/screens/admin/reference/RemoveConfirm'
import {
  type Faculty,
  PIN_LEFT,
  PIN_RIGHT,
  type Refusal,
  refusalOf,
  type Row,
  text,
} from '@/screens/admin/reference/shared'
import { ViewActions } from '@/screens/admin/reference/ViewActions'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

type Mode = 'view' | 'edit' | 'move' | 'remove'

export function ReferenceRow({
  spec,
  row,
  faculties,
  flag,
}: {
  spec: ReferenceTableSpec
  row: Row
  faculties: Faculty[]
  flag?: string
}) {
  const write = useReferenceWrite()
  const key = text(row[spec.key.field])
  const saved = Object.fromEntries(
    spec.fields.map((f) => [f.field, text(row[f.field])]),
  )
  const [mode, setMode] = useState<Mode>('view')
  const [draft, setDraft] = useState(saved)
  const [refusal, setRefusal] = useState<Refusal | null>(null)

  const changed = spec.fields.filter((f) => draft[f.field] !== saved[f.field])
  const renamed = changed.some((f) => f.named)
  const moving = changed.some((f) => f.kind === 'faculty')
  const facultyName = (code: string) =>
    faculties.find((f) => f.code === code)?.name ?? code

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
        values: Object.fromEntries(
          changed.map((f) => [f.field, draft[f.field]]),
        ),
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
        onSuccess: () =>
          toast.success('Removed', { description: `${spec.label}: ${key}` }),
        onError: (error) => {
          setRefusal(refusalOf(error))
          setMode('view')
        },
      },
    )

  const editing = mode !== 'view' && mode !== 'remove'

  return (
    <tr className="align-top">
      <Td
        className={cn(
          PIN_LEFT,
          'whitespace-nowrap font-medium',
          editing ? 'bg-amber-50' : 'bg-card',
        )}
      >
        {key}
        {flag && (
          <Badge variant="destructive" className="ml-2">
            {flag}
          </Badge>
        )}
      </Td>
      {spec.fields.map((f) => (
        <Td key={f.field} className={cn(editing && 'bg-amber-50')}>
          {editing ? (
            <FieldInput
              field={f}
              value={draft[f.field]}
              faculties={faculties}
              label={`${f.label} for ${key}`}
              error={
                refusal?.fields[f.field] ??
                (f.kind === 'faculty' ? refusal?.fields.faculty : undefined)
              }
              onChange={(value) => setDraft({ ...draft, [f.field]: value })}
            />
          ) : f.kind === 'faculty' ? (
            text(row.faculty) || facultyName(saved[f.field])
          ) : (
            saved[f.field] || '—'
          )}
        </Td>
      ))}
      <Td
        className={cn(
          PIN_RIGHT,
          'w-[22rem] min-w-[16rem]',
          editing ? 'bg-amber-50' : 'bg-card',
        )}
      >
        {mode === 'view' && (
          <ViewActions
            name={key}
            removable={spec.removable}
            onEdit={() => setMode('edit')}
            onRemove={() => setMode('remove')}
          />
        )}

        {mode === 'edit' && (
          <EditActions
            renamed={renamed}
            canSave={changed.length > 0}
            pending={write.isPending}
            onSave={() => (moving ? setMode('move') : save())}
            onCancel={cancel}
          />
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
          <RemoveConfirm
            noun={spec.noun}
            name={key}
            pending={write.isPending}
            onConfirm={remove}
            onCancel={() => setMode('view')}
          />
        )}

        {refusal && mode !== 'edit' && (
          <p className="mt-1 text-[12.5px] text-destructive">
            {refusal.message}
          </p>
        )}
        {refusal &&
          mode === 'edit' &&
          Object.keys(refusal.fields).length === 0 && (
            <p className="mt-1 text-[12.5px] text-destructive">
              {refusal.message}
            </p>
          )}
      </Td>
    </tr>
  )
}
