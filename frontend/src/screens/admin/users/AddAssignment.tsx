import { useState } from 'react'
import { toast } from 'sonner'

import { type AdminUser, type Role, useAddAssignment } from '@/api/admin-users'
import { searchDepartments, searchFaculties } from '@/api/org-search'
import { Button } from '@/components/ui/button'
import { OptionSelect } from '@/components/ui/option-select'
import { type SearchOption,SearchSelect } from '@/components/ui/search-select'

import { nameOf, refused, ROLE_LABEL } from './labels'

export function AddAssignment({ user }: { user: AdminUser }) {
  const add = useAddAssignment()
  const [role, setRole] = useState<Role>('hod')
  const [unit, setUnit] = useState<SearchOption | null>(null)

  // A dean is scoped to a faculty, everyone else to a department -- the same
  // rule the server holds, so the screen offers only what it would accept.
  const submit = () =>
    unit &&
    add.mutate(
      {
        id: user.id,
        role,
        department: role === 'dean' ? null : unit.value,
        faculty: role === 'dean' ? unit.value : null,
      },
      {
        onSuccess: () => {
          setUnit(null)
          toast.success(
            `${nameOf(user)} is now ${ROLE_LABEL[role].toLowerCase()} for ${unit.label}`,
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
            setUnit(null)
          }}
          options={[
            { value: 'hod', label: 'Head of Department' },
            { value: 'dean', label: 'Dean' },
            { value: 'member', label: 'Member' },
          ]}
          size="sm"
          className="w-48"
          aria-label="Role"
        />
        <SearchSelect
          key={role === 'dean' ? 'faculties' : 'departments'}
          value={unit}
          onChange={setUnit}
          searchKey={role === 'dean' ? 'faculties' : 'departments'}
          search={role === 'dean' ? searchFaculties : searchDepartments}
          placeholder={role === 'dean' ? 'Faculty…' : 'Department…'}
          size="sm"
          className="w-72"
          aria-label={role === 'dean' ? 'Faculty' : 'Department'}
        />
        <Button size="sm" disabled={!unit || add.isPending} onClick={submit}>
          Add
        </Button>
      </div>
    </div>
  )
}
