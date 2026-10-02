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
import { countText, type Staged } from '@/screens/admin/stagedChanges'

interface LeaveGuardProps {
  staged: Staged[]
  onLeave: () => void
  onStay: () => void
}

export function LeaveGuard({ staged, onLeave, onStay }: LeaveGuardProps) {
  return (
    <AlertDialog open>
      <AlertDialogContent onEscapeKeyDown={onStay}>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>
            {countText(staged)} {staged.length === 1 ? 'has' : 'have'} not been
            saved, and will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>Stay</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onLeave}>
            Leave without saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
