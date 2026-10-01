import { useDeferredValue, useState } from 'react'
import { useAdminUsers } from '@/api/admin-users'
import { PageHead, Panel } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateAccount } from './users/CreateAccount'
import { UserRow } from './users/UserRow'

/**
 * Accounts, their groups, and who approves what (#69).
 *
 * A group is the door someone signs in through; approving is an assignment
 * that names a department or a faculty. This is where RIC makes someone a head
 * of department or a dean, and so where a costing stranded on a role nobody
 * holds (#121) gets unstuck.
 */
export function Users() {
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())
  const { data: users, isFetching } = useAdminUsers(q)
  const [open, setOpen] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHead
        title="Users and approvers"
        subtitle="Who can sign in, and who authorises costings for which unit"
        right={
          <Button
            onClick={() => setCreating(!creating)}
            variant={creating ? 'ghost' : 'default'}
          >
            {creating ? 'Cancel' : 'New account'}
          </Button>
        }
      />

      {creating && <CreateAccount onDone={() => setCreating(false)} />}

      <Panel>
        <Input
          placeholder="Search by name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="mb-4 max-w-sm"
          aria-label="Search accounts"
        />
        <div
          className={`divide-y rounded-md border ${isFetching ? 'opacity-70' : ''}`}
        >
          {/* Not an empty list while the first answer is on its way. */}
          {users === undefined && (
            <div
              className="space-y-3 px-4 py-4"
              role="status"
              aria-label="Loading accounts"
            >
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}
          {users?.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              open={open === user.id}
              onToggle={() => setOpen(open === user.id ? null : user.id)}
            />
          ))}
          {users?.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              No account matches “{search}”.
            </p>
          )}
        </div>
      </Panel>
    </>
  )
}
