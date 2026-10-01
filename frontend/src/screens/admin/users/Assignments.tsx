import { useState } from 'react'

import { type AdminUser,useRemoveAssignment } from '@/api/admin-users'
import { Button } from '@/components/ui/button'

import { AddAssignment } from './AddAssignment'
import { refused,ROLE_LABEL } from './labels'

export function Assignments({ user }: { user: AdminUser }) {
  const remove = useRemoveAssignment()
  const [confirming, setConfirming] = useState<number | null>(null)

  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">Approves for</h3>
      {user.assignments.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          Nothing yet. This account is in no approval queue.
        </p>
      )}
      <ul className="space-y-1.5">
        {user.assignments.map((a) => (
          <li
            key={a.id}
            className="flex min-h-8 items-center justify-between gap-3 text-[13.5px]"
          >
            <span>
              <b>{ROLE_LABEL[a.role]}</b>, {a.department_name ?? a.faculty_name}
            </span>
            {confirming === a.id ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[12.5px] text-muted-foreground">
                  Remove it?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(
                      { id: user.id, assignmentId: a.id },
                      {
                        onSuccess: () => setConfirming(null),
                        onError: refused,
                      },
                    )
                  }
                >
                  Remove
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirming(null)}
                >
                  Cancel
                </Button>
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
      <AddAssignment user={user} />
    </section>
  )
}
