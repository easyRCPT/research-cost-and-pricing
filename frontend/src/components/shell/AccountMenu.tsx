import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ClipboardCheckIcon, FolderIcon, LogOutIcon, SettingsIcon } from 'lucide-react'
import { toast } from 'sonner'

import { isApprover, SUPERADMIN, useLogout, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'

const BAR_BUTTON =
  'border-primary-foreground/55 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'

/**
 * Who is signed in, and the way out. Clears the cache only after leaving, or
 * the guards refetch `me` on the way out and the sign-in screen renders twice.
 */
export function AccountMenu() {
  const me = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const path = useLocation({ select: (l) => l.pathname })
  const onQueue = path.startsWith('/approvals')
  const onConsole = path.startsWith('/admin')
  // Inside a costing the top bar's back button is the way out, so the switch
  // would only be a second button to the same place.
  const inCosting = /^\/projects\/\d+\//.test(path)

  if (!me.data) return null

  const signOut = () =>
    logout.mutate(undefined, {
      onSuccess: async () => {
        await navigate({ to: '/login', replace: true })
        queryClient.clear()
      },
      onError: () => toast.error("Couldn't sign out. Try again."),
    })

  return (
    <div className="flex items-center gap-3">
      {/*
        Only for someone who holds an approving assignment. They have two
        places to be -- their own costings and the ones waiting on them -- and
        this moves between the two.
      */}
      {me.data.groups.includes(SUPERADMIN) && (
        <Button
          variant="outline"
          size="lg"
          className={BAR_BUTTON}
          onClick={() => navigate({ to: onConsole ? '/projects' : '/admin' })}
        >
          {onConsole ? <FolderIcon /> : <SettingsIcon />}
          {onConsole ? 'My projects' : 'Admin'}
        </Button>
      )}
      {isApprover(me.data) && !inCosting && (
        <Button
          variant="outline"
          size="lg"
          className={BAR_BUTTON}
          onClick={() => navigate({ to: onQueue ? '/projects' : '/approvals' })}
        >
          {onQueue ? <FolderIcon /> : <ClipboardCheckIcon />}
          {onQueue ? 'My projects' : 'Approvals'}
        </Button>
      )}
      <span className="hidden text-xs text-primary-foreground/65 md:inline">
        {me.data.user.email}
      </span>
      <Button
        variant="outline"
        size="lg"
        disabled={logout.isPending}
        className={BAR_BUTTON}
        onClick={signOut}
      >
        <LogOutIcon />
        Sign out
      </Button>
    </div>
  )
}
