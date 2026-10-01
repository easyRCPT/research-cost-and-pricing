import { Suspense, useDeferredValue, useState } from 'react'

import { useAdminUsers } from '@/api/admin-users'
import { PageHead, Panel } from '@/components/shell'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { CreateAccount } from './users/CreateAccount'
import { UserEditor } from './users/UserEditor'
import { UserRow } from './users/UserRow'
import { UsersPager } from './users/UsersPager'

const PAGE_SIZE = 8

/**
 * The groups list loads the first time an editor opens, so the editor waits
 * behind this rather than the whole console going to its skeleton.
 */
function FormSkeleton({ label }: { label: string }) {
  return (
    <Panel className="mb-4">
      <RowsSkeleton label={label} rows={4} rowClassName="h-9" />
    </Panel>
  )
}

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
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  // A search that drops the open account leaves nothing selected.
  const lastPage = Math.max(0, Math.ceil((users?.length ?? 0) / PAGE_SIZE) - 1)
  const at = Math.min(page, lastPage)
  const shown = users?.slice(at * PAGE_SIZE, (at + 1) * PAGE_SIZE)
  const selected = users?.find((user) => user.id === selectedId)

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

      {creating && (
        <Suspense fallback={<FormSkeleton label="Loading the form" />}>
          <CreateAccount onDone={() => setCreating(false)} />
        </Suspense>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div>
          <Input
            placeholder="Search name or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
            className="mb-2.5 h-8 bg-white"
            aria-label="Search accounts"
          />
          <div
            className={`overflow-hidden rounded-lg border bg-white ${isFetching ? 'opacity-70' : ''}`}
          >
            {/* Not an empty list while the first answer is on its way. */}
            {users === undefined && (
              <RowsSkeleton
                label="Loading accounts"
                rows={6}
                rowClassName="h-9"
                className="p-3"
              />
            )}
            {users && users.length > 0 && (
              <ul>
                {shown?.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    selected={user.id === selected?.id}
                    onSelect={() => setSelectedId(user.id)}
                  />
                ))}
              </ul>
            )}
            {users && users.length > PAGE_SIZE && (
              <UsersPager
                page={at}
                pageSize={PAGE_SIZE}
                total={users.length}
                onPage={setPage}
              />
            )}
            {users?.length === 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                No account matches “{search}”.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <Suspense fallback={<FormSkeleton label="Loading account" />}>
              <UserEditor key={selected.id} user={selected} />
            </Suspense>
          ) : (
            <Panel title="No account open">
              <p className="text-[13px] text-muted-foreground">
                Choose an account on the left to edit its name, groups and who
                it approves for.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
