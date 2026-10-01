import type { AdminUser } from '@/api/admin-users'
import { cn } from '@/lib/utils'

import { nameOf } from './labels'

export function UserRow({
  user,
  selected,
  onSelect,
}: {
  user: AdminUser
  selected: boolean
  onSelect: () => void
}) {
  const approvals = user.assignments.length
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'w-full border-b px-3.5 py-2.5 text-left last:border-0',
          selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60',
        )}
      >
        <span className="flex items-center gap-2 text-[13.5px] font-medium">
          {nameOf(user)}
          {!user.is_active && (
            <span
              className={cn(
                'text-[11px] font-semibold',
                selected ? 'text-primary-foreground/70' : 'text-destructive',
              )}
            >
              Deactivated
            </span>
          )}
        </span>
        <span
          className={cn(
            'block truncate text-[12px]',
            selected ? 'text-primary-foreground/65' : 'text-muted-foreground',
          )}
        >
          {user.email}
        </span>
        <span
          className={cn(
            'block truncate text-[11.5px]',
            selected
              ? 'text-primary-foreground/50'
              : 'text-muted-foreground/80',
          )}
        >
          {user.groups.join(', ') || 'no groups'}
          {approvals > 0 &&
            ` · approves for ${approvals} unit${approvals > 1 ? 's' : ''}`}
        </span>
      </button>
    </li>
  )
}
