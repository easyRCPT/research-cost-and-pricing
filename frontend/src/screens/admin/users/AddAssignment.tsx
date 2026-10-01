import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { type AdminUser, type Role,useAddAssignment } from '@/api/admin-users'
import { useLookups } from '@/api/lookups'
import { Button } from '@/components/ui/button'
import { OptionSelect } from '@/components/ui/option-select'

import { nameOf, refused,ROLE_LABEL } from './labels'

export function AddAssignment({ user }: { user: AdminUser }) {
  const { data: lookups } = useLookups()
  const add = useAddAssignment()
  const [role, setRole] = useState<Role>('hod')
  const [unit, setUnit] = useState('')

  // A dean is scoped to a faculty, everyone else to a department -- the same
  // rule the server holds, so the screen offers only what it would accept.
  const faculties = useMemo(() => {
    const seen = new Map<string, string>()
    for (const d of lookups.departments) seen.set(d.faculty_code, d.faculty)
    return [...seen]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [lookups.departments])
  const units =
    role === 'dean'
      ? faculties
      : lookups.departments
          .map((d) => ({ code: d.code, name: d.name }))
          .sort((a, b) => a.name.localeCompare(b.name))

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
          toast.success(
            `${nameOf(user)} is now ${ROLE_LABEL[role].toLowerCase()} for ${units.find((u) => u.code === unit)?.name}`,
          )
        },
        onError: refused,
      },
    )

  return (
    <div className="mt-4 grid gap-2 border-t pt-3">
      <span className="text-[12.5px] font-medium">Add an assignment</span>
      <div className="flex flex-wrap gap-2">
        <OptionSelect
          value={role}
          onValueChange={(next) => {
            setRole(next as Role)
            setUnit('')
          }}
          options={[
            { value: 'hod', label: 'Head of Department' },
            { value: 'dean', label: 'Dean' },
            { value: 'member', label: 'Member' },
          ]}
          size="sm"
          className="w-48 bg-white"
          aria-label="Role"
        />
        <OptionSelect
          value={unit}
          onValueChange={setUnit}
          options={units.map((u) => ({ value: u.code, label: u.name }))}
          placeholder={role === 'dean' ? 'Faculty…' : 'Department…'}
          size="sm"
          className="w-72 bg-white"
          aria-label={role === 'dean' ? 'Faculty' : 'Department'}
        />
        <Button size="sm" disabled={!unit || add.isPending} onClick={submit}>
          Add
        </Button>
      </div>
    </div>
  )
}
