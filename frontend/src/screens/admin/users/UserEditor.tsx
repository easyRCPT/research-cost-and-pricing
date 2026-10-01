import { useState } from 'react'
import { useGroups, useUpdateUser, type AdminUser } from '@/api/admin-users'
import { SUPERADMIN, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { shortDate } from '@/lib/format/dates'
import { Assignments } from './Assignments'
import { nameOf, refused } from './labels'
import { Names } from './Names'

type Changes = Parameters<
  ReturnType<typeof useUpdateUser>['mutate']
>[0]['changes']

interface Pending {
  title: string
  body: string
  confirm: string
  changes: Changes
}

const LOCKOUT = {
  title: 'This is the account you are signed in as',
  body: 'Saving it shuts you out of the console straight away, and only another superadmin can let you back in.',
}

export function UserEditor({ user }: { user: AdminUser }) {
  const { data: allGroups } = useGroups()
  const { data: me } = useMe()
  const update = useUpdateUser()
  const yourself = me?.user.id === user.id
  // A change that takes access away, held until it is confirmed (#69).
  const [pending, setPending] = useState<Pending | null>(null)

  const save = (changes: Changes) => {
    setPending(null)
    update.mutate({ id: user.id, changes }, { onError: refused })
  }

  const toggleGroup = (group: string, on: boolean) => {
    const groups = on
      ? [...user.groups, group]
      : user.groups.filter((g) => g !== group)
    if (yourself && !on && group === SUPERADMIN) {
      return setPending({
        ...LOCKOUT,
        confirm: 'Yes, remove my superadmin group',
        changes: { groups },
      })
    }
    save({ groups })
  }

  const toggleActive = () => {
    if (!user.is_active) return save({ is_active: true })
    setPending(
      yourself
        ? {
            ...LOCKOUT,
            confirm: 'Yes, deactivate my account',
            changes: { is_active: false },
          }
        : {
            title: `Deactivate ${nameOf(user)}?`,
            body: 'They will not be able to sign in, and they drop out of every approval queue. Their costings stay theirs, and the account can be reactivated later.',
            confirm: 'Deactivate',
            changes: { is_active: false },
          },
    )
  }

  return (
    <div className="mt-4 rounded-md border bg-muted/30 p-4">
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        Joined {shortDate(user.date_joined)} ·{' '}
        {user.last_login
          ? `last signed in ${shortDate(user.last_login)}`
          : 'never signed in'}
      </p>

      <Names user={user} />

      {pending && (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px]"
          role="alert"
        >
          <p className="font-semibold text-destructive">{pending.title}</p>
          <p className="mt-1">{pending.body}</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={update.isPending}
              onClick={() => save(pending.changes)}
            >
              {pending.confirm}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[13px] font-semibold">Groups</h3>
          <p className="mb-2 text-[12px] text-muted-foreground">
            Which door this account signs in through. It grants no approving on
            its own.
          </p>
          {allGroups.map((group) => (
            <label
              key={group}
              className="flex items-center gap-2 py-1 text-[13.5px]"
            >
              <Checkbox
                checked={user.groups.includes(group)}
                disabled={update.isPending || !!pending}
                onCheckedChange={(on) => toggleGroup(group, on === true)}
              />
              {group}
            </label>
          ))}

          <h3 className="mt-5 mb-2 text-[13px] font-semibold">Access</h3>
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending || !!pending}
            className={
              user.is_active ? 'border-destructive/40 text-destructive' : ''
            }
            onClick={toggleActive}
          >
            {user.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {user.is_active
              ? `Stops ${yourself ? 'you' : 'them'} signing in and takes ${yourself ? 'you' : 'them'} out of every approval queue. Their costings stay theirs. Accounts are never deleted.`
              : 'This account cannot sign in.'}
          </p>
        </section>

        <Assignments user={user} />
      </div>
    </div>
  )
}
