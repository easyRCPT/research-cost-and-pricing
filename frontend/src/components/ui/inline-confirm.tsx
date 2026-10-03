import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InlineConfirmProps {
  confirm: ReactNode
  /** Shown on the confirm button while `pending`. */
  pendingLabel?: ReactNode
  cancel?: ReactNode
  variant?: 'default' | 'destructive'
  size?: 'sm' | 'default'
  /** Disables confirm only; both buttons are disabled while `pending`. */
  disabled?: boolean
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

/** A confirm and cancel button pair; cancel is locked while the action runs. */
export function InlineConfirm({
  confirm,
  pendingLabel,
  cancel = 'Cancel',
  variant,
  size = 'sm',
  disabled,
  pending,
  onConfirm,
  onCancel,
  className,
}: InlineConfirmProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      <Button
        size={size}
        variant={variant}
        disabled={disabled || pending}
        onClick={onConfirm}
      >
        {pending && pendingLabel ? pendingLabel : confirm}
      </Button>
      <Button size={size} variant="ghost" disabled={pending} onClick={onCancel}>
        {cancel}
      </Button>
    </div>
  )
}
