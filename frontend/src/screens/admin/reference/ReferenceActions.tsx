import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormFields } from '@/screens/admin/FormFields'
import { MoveConfirm } from '@/screens/admin/reference/MoveConfirm'
import { RemoveConfirm } from '@/screens/admin/reference/RemoveConfirm'
import { type Faculty, facultyOptions, type Row } from '@/screens/admin/reference/shared'
import { useReferenceRowEdit } from '@/screens/admin/reference/useReferenceRowEdit'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

/** A reference row's Edit and Remove, each asked in a dialog and saved on its own. */
export function ReferenceActions({
  spec,
  row,
  faculties,
}: {
  spec: ReferenceTableSpec
  row: Row
  faculties: Faculty[]
}) {
  const {
    key,
    mode,
    setMode,
    draft,
    setField,
    refusal,
    notice,
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
    <>
      <div className="flex justify-end gap-1">
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setMode('edit')}
          aria-label={`Edit ${key}`}
        >
          Edit
        </Button>
        {spec.removable && (
          <Button
            size="xs"
            variant="ghost"
            className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
            onClick={() => setMode('remove')}
            aria-label={`Remove ${key}`}
          >
            Remove
          </Button>
        )}
      </div>
      {mode === 'view' && notice && (
        <p className="mt-1 text-right text-[12px] text-destructive">{notice}</p>
      )}

      <Dialog
        open={mode === 'edit' || mode === 'move'}
        onOpenChange={(open) => !open && !pending && cancel()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {spec.noun} {key}
            </DialogTitle>
          </DialogHeader>
          {mode === 'move' ? (
            <MoveConfirm
              department={key}
              to={facultyName(draft.faculty_code)}
              pending={pending}
              onConfirm={save}
              onCancel={() => setMode('edit')}
            />
          ) : (
            <div className="grid gap-4">
              <FormFields
                fields={spec.fields}
                values={draft}
                options={facultyOptions(faculties)}
                refusal={refusal}
                labelOf={(f) => `${f.label} for ${key}`}
                onChange={(field, value) => setField(field, String(value))}
              />
              {notice && (
                <p className="text-[12.5px] text-destructive">{notice}</p>
              )}
              {renamed && (
                <p className="text-[12.5px] text-muted-foreground">
                  Costings already approved will show the new name: names
                  aren't versioned. The audit log keeps the old one.
                </p>
              )}
              <DialogFooter>
                <Button variant="ghost" disabled={pending} onClick={cancel}>
                  Cancel
                </Button>
                <Button disabled={!canSave || pending} onClick={submit}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={mode === 'remove'}
        onOpenChange={(open) => !open && !pending && setMode('view')}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {spec.noun} {key}
            </DialogTitle>
          </DialogHeader>
          <RemoveConfirm
            noun={spec.noun}
            name={key}
            pending={pending}
            onConfirm={remove}
            onCancel={() => setMode('view')}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
