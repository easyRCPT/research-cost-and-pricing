import { useState } from 'react'

import {
  type AdminUser,
  useRemoveAssignment,
  useUpdateUser,
} from '@/api/admin-users'
import { RESEARCHER, STAFF } from '@/api/auth'
import { Panel } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { InlineConfirm } from '@/components/ui/inline-confirm'

import { AddAssignment } from './AddAssignment'
import { refused, ROLE_LABEL } from './labels'

export function Assignments({ user }: { user: AdminUser }) {
  const remove = useRemoveAssignment()
  const update = useUpdateUser()
  const [confirming, setConfirming] = useState<number | null>(null)
  const researcher = user.groups.includes(RESEARCHER)

  const moveToStaff = () =>
    update.mutate(
      {
        id: user.id,
        changes: {
          groups: [...user.groups.filter((g) => g !== RESEARCHER), STAFF],
        },
      },
      { onError: refused },
    )

  return (
    <Panel
      title="Approves for"
      description="Heads and members are assigned to a department, deans to a faculty."
    >
      {user.assignments.length === 0 && (
        <p className="rounded-md border px-3 py-6 text-center text-[13px] text-muted-foreground">
          Nothing yet. This account is in no approval queue.
        </p>
      )}
      <ul className="divide-y rounded-md border empty:hidden">
        {user.assignments.map((a) => (
          <li
            key={a.id}
            className="flex min-h-11 items-center justify-between gap-3 px-3 text-[13.5px]"
          >
            <span>
              <b>{ROLE_LABEL[a.role]}</b>, {a.department_name ?? a.faculty_name}
            </span>
            {confirming === a.id ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[12.5px] text-muted-foreground">
                  Remove it?
                </span>
                <InlineConfirm
                  className="gap-1.5"
                  confirm="Remove"
                  variant="destructive"
                  pending={remove.isPending}
                  onConfirm={() =>
                    remove.mutate(
                      { id: user.id, assignmentId: a.id },
                      {
                        onSuccess: () => setConfirming(null),
                        onError: refused,
                      },
                    )
                  }
                  onCancel={() => setConfirming(null)}
                />
              </span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(a.id)}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {user.groups.includes(STAFF) ? (
        <AddAssignment user={user} />
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-[13px] text-muted-foreground">
            {researcher
              ? 'A researcher cannot approve for a unit.'
              : 'Only staff can approve for a unit.'}{' '}
            Move this account to staff to assign it a department or faculty.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={moveToStaff}
          >
            Move to staff
          </Button>
        </div>
      )}
    </Panel>
  )
}
