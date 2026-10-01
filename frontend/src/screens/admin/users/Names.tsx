import { useState } from 'react'
import { toast } from 'sonner'
import { useUpdateUser, type AdminUser } from '@/api/admin-users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { refused } from './labels'

export function Names({ user }: { user: AdminUser }) {
  const update = useUpdateUser()
  const [first, setFirst] = useState(user.first_name)
  const [last, setLast] = useState(user.last_name)
  const dirty =
    first.trim() !== user.first_name || last.trim() !== user.last_name

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-[12.5px] text-muted-foreground">
        First name
        <Input
          className="h-8 w-48 bg-white"
          value={first}
          onChange={(event) => setFirst(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-[12.5px] text-muted-foreground">
        Last name
        <Input
          className="h-8 w-48 bg-white"
          value={last}
          onChange={(event) => setLast(event.target.value)}
        />
      </label>
      {dirty && (
        <>
          <Button
            size="sm"
            disabled={update.isPending || !first.trim()}
            onClick={() =>
              update.mutate(
                {
                  id: user.id,
                  changes: { first_name: first.trim(), last_name: last.trim() },
                },
                {
                  onSuccess: () => toast.success('Name saved'),
                  onError: refused,
                },
              )
            }
          >
            {update.isPending ? 'Saving…' : 'Save name'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFirst(user.first_name)
              setLast(user.last_name)
            }}
          >
            Discard
          </Button>
        </>
      )}
    </div>
  )
}
