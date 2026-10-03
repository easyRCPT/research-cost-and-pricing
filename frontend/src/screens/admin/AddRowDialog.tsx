import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { KINDS } from '@/screens/admin/fieldKinds'
import { type Entered, type FormField, FormFields } from '@/screens/admin/FormFields'
import type { Refusal } from '@/screens/admin/reference/shared'

/** A table's Add button and the form it opens; `onAdd` gets what was typed and a `done` that closes it. */
export function AddRowDialog({
  title,
  fields,
  options,
  ready,
  pending = false,
  refusal = null,
  onOpenChange,
  onAdd,
}: {
  title: string
  fields: FormField[]
  options?: { value: string; label: string }[]
  ready: (entered: Entered) => boolean
  pending?: boolean
  refusal?: Refusal | null
  onOpenChange?: (open: boolean) => void
  onAdd: (entered: Entered, done: () => void) => void
}) {
  const blank = (): Entered =>
    Object.fromEntries(fields.map((f) => [f.field, KINDS[f.kind].blank]))
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(blank)

  const openChange = (next: boolean) => {
    if (next) setEntered(blank())
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7">
          <Plus /> {title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (ready(entered) && !pending) onAdd(entered, () => setOpen(false))
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <FormFields
            fields={fields}
            values={entered}
            options={options}
            refusal={refusal}
            onChange={(field, value) => setEntered({ ...entered, [field]: value })}
          />
          {refusal && Object.keys(refusal.fields).length === 0 && (
            <p className="text-[12.5px] text-destructive">{refusal.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready(entered) || pending}>
              {pending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
