import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AccountType } from '@/api/auth'

/**
 * Which door, sent to the server as `account_type`.
 *
 * Not decoration: the server refuses a sign-in whose group does not match the
 * tab, and answers exactly as it does for a wrong password (#42). A superadmin
 * passes either.
 *
 * The copy says who each door is for rather than what they do, because Staff
 * is how an approver gets in and approving is not a job title -- it is a `hod`
 * or `dean` assignment on a staff account (#40, #41).
 */
const DOORS: { value: AccountType; label: string; who: string }[] = [
  {
    value: 'researcher',
    label: 'Researcher',
    who: 'Chief and co-investigators costing their own projects.',
  },
  {
    value: 'staff',
    label: 'Staff',
    who: 'University staff, including heads of department and deans.',
  },
]

export function AccountTabs({
  value,
  onChange,
}: {
  value: AccountType
  onChange: (value: AccountType) => void
}) {
  const current = DOORS.find((door) => door.value === value)

  return (
    <div className="mb-5">
      <Tabs value={value} onValueChange={(next) => onChange(next as AccountType)}>
        <TabsList className="w-full">
          {DOORS.map((door) => (
            <TabsTrigger key={door.value} value={door.value} className="flex-1">
              {door.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="mt-2 text-xs text-muted-foreground">{current?.who}</p>
    </div>
  )
}
