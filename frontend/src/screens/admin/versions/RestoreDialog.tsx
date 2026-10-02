import { toast } from 'sonner'

import { type LookupVersion, useRestoreVersion } from '@/api/admin-lookups'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { messageOf } from '@/lib/api'

import type { RatesMoved } from './types'

interface RestoreDialogProps {
  version: LookupVersion
  onClose: () => void
  onRestored: (moved: RatesMoved) => void
}

export function RestoreDialog({
  version,
  onClose,
  onRestored,
}: RestoreDialogProps) {
  const restore = useRestoreVersion()

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !restore.isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore version #{version.id}?</AlertDialogTitle>
          <AlertDialogDescription>
            The rates go back to how they were in version #{version.id}, as a
            new version. Costings already submitted keep their rates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={restore.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={restore.isPending}
            onClick={(event) => {
              event.preventDefault()
              restore.mutate(version.id, {
                onSuccess: (restored) => {
                  onClose()
                  onRestored({
                    title: `Rates restored from version #${version.id}`,
                    description: `They are now version #${restored.version_id}.`,
                    replaced: restored.replaced,
                  })
                },
                onError: (error) =>
                  toast.error('Not restored', {
                    description: messageOf(error),
                  }),
              })
            }}
          >
            {restore.isPending ? 'Restoring…' : 'Restore these rates'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
