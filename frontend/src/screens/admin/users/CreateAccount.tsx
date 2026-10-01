import { useState } from 'react'
import { toast } from 'sonner'

import { useCreateUser, useGroups } from '@/api/admin-users'
import { Panel } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

import { refused } from './labels'

export function CreateAccount({ onDone }: { onDone: () => void }) {
  const { data: allGroups } = useGroups()
  const create = useCreateUser()
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
  })
  const [groups, setGroups] = useState<string[]>(['staff'])
  const ready =
    form.email && form.first_name && form.last_name && form.password.length >= 8

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label className="grid gap-1 text-[12.5px] text-muted-foreground">
      {label}
      <Input
        type={type}
        value={form[key]}
        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
      />
    </label>
  )

  return (
    <Panel title="New account" className="mb-4">
      <div className="grid max-w-3xl gap-3 md:grid-cols-2">
        {field('first_name', 'First name')}
        {field('last_name', 'Last name')}
        {field('email', 'Email', 'email')}
        {field(
          'password',
          'Temporary password (8 or more characters)',
          'password',
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {allGroups.map((group) => (
          <label key={group} className="flex items-center gap-2 text-[13.5px]">
            <Checkbox
              checked={groups.includes(group)}
              onCheckedChange={(on) =>
                setGroups(
                  on === true
                    ? [...groups, group]
                    : groups.filter((g) => g !== group),
                )
              }
            />
            {group}
          </label>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        Approving is added after, as an assignment. Creating the account does
        not sign you in as them.
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
