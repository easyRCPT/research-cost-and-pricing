import type { AdminUser } from '@/api/admin-users'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABEL, nameOf } from './labels'
import { UserEditor } from './UserEditor'

export function UserRow({
  user,
  open,
  onToggle,
}: {
  user: AdminUser
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <span>
          <span className="font-medium">{nameOf(user)}</span>
          {!user.is_active && (
            <Badge variant="destructive" className="ml-2">
              Deactivated
            </Badge>
          )}
          <span className="block text-[12.5px] text-muted-foreground">
            {user.email}
          </span>
          {user.assignments.length > 0 && (
            <span className="mt-1 block text-[12.5px]">
              {user.assignments
                .map(
                  (a) =>
                    `${ROLE_LABEL[a.role]}, ${a.department_name ?? a.faculty_name ?? ''}`,
                )
                .join(' · ')}
            </span>
          )}
        </span>
        <span className="flex flex-wrap justify-end gap-1">
          {user.groups.map((group) => (
            <Badge key={group} variant="secondary">
              {group}
            </Badge>
          ))}
        </span>
      </button>
      {open && <UserEditor user={user} />}
    </div>
  )
}
