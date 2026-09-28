import { useDeferredValue, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  useAddAssignment,
  useAdminUsers,
  useCreateUser,
  useGroups,
  useRemoveAssignment,
  useUpdateUser,
  type AdminUser,
  type Role,
} from '@/api/admin-users'
import { SUPERADMIN, useMe } from '@/api/auth'
import { useLookups } from '@/api/lookups'
import { PageHead, Panel } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { shortDate } from '@/lib/format/dates'

const ROLE_LABEL: Record<Role, string> = {
  hod: 'Head of Department',
  dean: 'Dean',
  member: 'Member',
}

const refused = (error: unknown) =>
  toast.error('Not saved', { description: error instanceof ApiError ? error.message : 'Try again.' })

const nameOf = (user: AdminUser) => `${user.first_name} ${user.last_name}`.trim() || user.email

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
          <Button onClick={() => setCreating(!creating)} variant={creating ? 'ghost' : 'default'}>
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
        <div className={`divide-y rounded-md border ${isFetching ? 'opacity-70' : ''}`}>
          {/* Not an empty list while the first answer is on its way. */}
          {users === undefined && (
            <div className="space-y-3 px-4 py-4" role="status" aria-label="Loading accounts">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
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

function UserRow({ user, open, onToggle }: { user: AdminUser; open: boolean; onToggle: () => void }) {
  return (
    <div className="px-4 py-3">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start justify-between gap-4 text-left">
        <span>
          <span className="font-medium">{nameOf(user)}</span>
          {!user.is_active && <Badge variant="destructive" className="ml-2">Deactivated</Badge>}
          <span className="block text-[12.5px] text-muted-foreground">{user.email}</span>
          {user.assignments.length > 0 && (
            <span className="mt-1 block text-[12.5px]">
              {user.assignments
                .map((a) => `${ROLE_LABEL[a.role]}, ${a.department_name ?? a.faculty_name ?? ''}`)
                .join(' · ')}
            </span>
          )}
        </span>
        <span className="flex flex-wrap justify-end gap-1">
          {user.groups.map((group) => (
            <Badge key={group} variant="secondary">{group}</Badge>
          ))}
        </span>
      </button>
      {open && <UserEditor user={user} />}
    </div>
  )
}

type Changes = Parameters<ReturnType<typeof useUpdateUser>['mutate']>[0]['changes']

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

function UserEditor({ user }: { user: AdminUser }) {
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
    const groups = on ? [...user.groups, group] : user.groups.filter((g) => g !== group)
    if (yourself && !on && group === SUPERADMIN) {
      return setPending({ ...LOCKOUT, confirm: 'Yes, remove my superadmin group', changes: { groups } })
    }
    save({ groups })
  }

  const toggleActive = () => {
    if (!user.is_active) return save({ is_active: true })
    setPending(
      yourself
        ? { ...LOCKOUT, confirm: 'Yes, deactivate my account', changes: { is_active: false } }
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
        {user.last_login ? `last signed in ${shortDate(user.last_login)}` : 'never signed in'}
      </p>

      <Names user={user} />

      {pending && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px]" role="alert">
          <p className="font-semibold text-destructive">{pending.title}</p>
          <p className="mt-1">{pending.body}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" disabled={update.isPending} onClick={() => save(pending.changes)}>
              {pending.confirm}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[13px] font-semibold">Groups</h3>
          <p className="mb-2 text-[12px] text-muted-foreground">
            Which door this account signs in through. It grants no approving on its own.
          </p>
          {allGroups.map((group) => (
            <label key={group} className="flex items-center gap-2 py-1 text-[13.5px]">
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
            className={user.is_active ? 'border-destructive/40 text-destructive' : ''}
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

function Names({ user }: { user: AdminUser }) {
  const update = useUpdateUser()
  const [first, setFirst] = useState(user.first_name)
  const [last, setLast] = useState(user.last_name)
  const dirty = first.trim() !== user.first_name || last.trim() !== user.last_name

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-[12.5px] text-muted-foreground">
        First name
        <Input className="h-8 w-48 bg-white" value={first} onChange={(event) => setFirst(event.target.value)} />
      </label>
      <label className="grid gap-1 text-[12.5px] text-muted-foreground">
        Last name
        <Input className="h-8 w-48 bg-white" value={last} onChange={(event) => setLast(event.target.value)} />
      </label>
      {dirty && (
        <>
          <Button
            size="sm"
            disabled={update.isPending || !first.trim()}
            onClick={() =>
              update.mutate(
                { id: user.id, changes: { first_name: first.trim(), last_name: last.trim() } },
                { onSuccess: () => toast.success('Name saved'), onError: refused },
              )
            }
          >
            {update.isPending ? 'Saving…' : 'Save name'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setFirst(user.first_name); setLast(user.last_name) }}>
            Discard
          </Button>
        </>
      )}
    </div>
  )
}

function Assignments({ user }: { user: AdminUser }) {
  const remove = useRemoveAssignment()
  const [confirming, setConfirming] = useState<number | null>(null)

  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">Approves for</h3>
      {user.assignments.length === 0 && (
        <p className="text-[13px] text-muted-foreground">Nothing yet. This account is in no approval queue.</p>
      )}
      <ul className="space-y-1.5">
        {user.assignments.map((a) => (
          <li key={a.id} className="flex min-h-8 items-center justify-between gap-3 text-[13.5px]">
            <span>
              <b>{ROLE_LABEL[a.role]}</b>, {a.department_name ?? a.faculty_name}
            </span>
            {confirming === a.id ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[12.5px] text-muted-foreground">Remove it?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(
                      { id: user.id, assignmentId: a.id },
                      { onSuccess: () => setConfirming(null), onError: refused },
                    )
                  }
                >
                  Remove
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(a.id)}>
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

function AddAssignment({ user }: { user: AdminUser }) {
  const { data: lookups } = useLookups()
  const add = useAddAssignment()
  const [role, setRole] = useState<Role>('hod')
  const [unit, setUnit] = useState('')

  // A dean is scoped to a faculty, everyone else to a department -- the same
  // rule the server holds, so the screen offers only what it would accept.
  const faculties = useMemo(() => {
    const seen = new Map<string, string>()
    for (const d of lookups.departments) seen.set(d.faculty_code, d.faculty)
    return [...seen].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [lookups.departments])
  const units =
    role === 'dean'
      ? faculties
      : lookups.departments.map((d) => ({ code: d.code, name: d.name })).sort((a, b) => a.name.localeCompare(b.name))

  const submit = () =>
    add.mutate(
      {
        id: user.id,
        role,
        department: role === 'dean' ? null : unit,
        faculty: role === 'dean' ? unit : null,
      },
      {
        onSuccess: () => {
          setUnit('')
          toast.success(`${nameOf(user)} is now ${ROLE_LABEL[role].toLowerCase()} for ${units.find((u) => u.code === unit)?.name}`)
        },
        onError: refused,
      },
    )

  return (
    <div className="mt-4 grid gap-2 border-t pt-3">
      <span className="text-[12.5px] font-medium">Add an assignment</span>
      <div className="flex flex-wrap gap-2">
        <Select value={role} onValueChange={(next) => { setRole(next as Role); setUnit('') }}>
          <SelectTrigger size="sm" className="w-48 bg-white" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hod">Head of Department</SelectItem>
            <SelectItem value="dean">Dean</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger size="sm" className="w-72 bg-white" aria-label={role === 'dean' ? 'Faculty' : 'Department'}>
            <SelectValue placeholder={role === 'dean' ? 'Faculty…' : 'Department…'} />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.code} value={u.code}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!unit || add.isPending} onClick={submit}>
          Add
        </Button>
      </div>
    </div>
  )
}

function CreateAccount({ onDone }: { onDone: () => void }) {
  const { data: allGroups } = useGroups()
  const create = useCreateUser()
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', password: '' })
  const [groups, setGroups] = useState<string[]>(['staff'])
  const ready = form.email && form.first_name && form.last_name && form.password.length >= 8

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label className="grid gap-1 text-[12.5px] text-muted-foreground">
      {label}
      <Input type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </label>
  )

  return (
    <Panel title="New account" className="mb-4">
      <div className="grid max-w-3xl gap-3 md:grid-cols-2">
        {field('first_name', 'First name')}
        {field('last_name', 'Last name')}
        {field('email', 'Email', 'email')}
        {field('password', 'Temporary password (8 or more characters)', 'password')}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {allGroups.map((group) => (
          <label key={group} className="flex items-center gap-2 text-[13.5px]">
            <Checkbox
              checked={groups.includes(group)}
              onCheckedChange={(on) => setGroups(on === true ? [...groups, group] : groups.filter((g) => g !== group))}
            />
            {group}
          </label>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        Approving is added after, as an assignment. Creating the account does not sign you in as them.
      </p>
      <Button
        className="mt-3"
        disabled={!ready || create.isPending}
        onClick={() =>
          create.mutate(
            { ...form, groups },
            {
              onSuccess: () => {
                toast.success(`Account created for ${form.email}`)
                onDone()
              },
              onError: refused,
            },
          )
        }
      >
        {create.isPending ? 'Creating…' : 'Create account'}
      </Button>
    </Panel>
  )
}
