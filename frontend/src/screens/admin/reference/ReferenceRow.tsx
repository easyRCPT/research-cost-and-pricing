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
  type Row,
  text,
} from '@/screens/admin/reference/shared'
import { useReferenceRowEdit } from '@/screens/admin/reference/useReferenceRowEdit'
import { ViewActions } from '@/screens/admin/reference/ViewActions'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

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
  const {
    key,
    saved,
    mode,
    setMode,
    draft,
    setField,
    refusal,
    notice,
    editing,
    canSave,
    renamed,
    facultyName,
    cancel,
    submit,
    save,
    remove,
    pending,
  } = useReferenceRowEdit(spec, row, faculties)

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
              onChange={(value) => setField(f.field, value)}
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
            canSave={canSave}
            pending={pending}
            onSave={submit}
            onCancel={cancel}
          />
        )}

        {mode === 'move' && (
          <MoveConfirm
            department={key}
            to={facultyName(draft.faculty_code)}
            pending={pending}
            onConfirm={save}
            onCancel={() => setMode('edit')}
          />
        )}

        {mode === 'remove' && (
          <RemoveConfirm
            noun={spec.noun}
            name={key}
            pending={pending}
            onConfirm={remove}
            onCancel={() => setMode('view')}
          />
        )}

        {notice && (
          <p className="mt-1 text-[12.5px] text-destructive">{notice}</p>
        )}
      </Td>
    </tr>
  )
}
