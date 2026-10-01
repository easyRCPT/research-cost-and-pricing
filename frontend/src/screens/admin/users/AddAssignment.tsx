import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAddAssignment, type AdminUser, type Role } from '@/api/admin-users'
import { useLookups } from '@/api/lookups'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLE_LABEL, nameOf, refused } from './labels'

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
        <Select
          value={role}
          onValueChange={(next) => {
            setRole(next as Role)
            setUnit('')
          }}
        >
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
          <SelectTrigger
            size="sm"
            className="w-72 bg-white"
            aria-label={role === 'dean' ? 'Faculty' : 'Department'}
          >
            <SelectValue
              placeholder={role === 'dean' ? 'Faculty…' : 'Department…'}
            />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.code} value={u.code}>
                {u.name}
              </SelectItem>
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
