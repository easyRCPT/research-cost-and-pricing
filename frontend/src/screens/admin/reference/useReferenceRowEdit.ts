import { useState } from 'react'
import { toast } from 'sonner'

import { useReferenceWrite } from '@/api/admin-lookups'
import {
  type Faculty,
  type Refusal,
  refusalOf,
  type Row,
  text,
} from '@/screens/admin/reference/shared'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

type Mode = 'view' | 'edit' | 'move' | 'remove'

/** Holds one reference row's edit, move and remove state and its save and remove writes. */
export function useReferenceRowEdit(
  spec: ReferenceTableSpec,
  row: Row,
  faculties: Faculty[],
) {
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

  const submit = () => (moving ? setMode('move') : save())
  const editing = mode !== 'view' && mode !== 'remove'
  const notice =
    refusal && (mode !== 'edit' || Object.keys(refusal.fields).length === 0)
      ? refusal.message
      : null

  return {
    key,
    saved,
    mode,
    setMode,
    draft,
    setField: (field: string, value: string) =>
      setDraft({ ...draft, [field]: value }),
    refusal,
    notice,
    editing,
    canSave: changed.length > 0,
    renamed,
    facultyName,
    cancel,
    submit,
    save,
    remove,
    pending: write.isPending,
  }
}
