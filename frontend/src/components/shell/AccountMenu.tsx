import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { LogOutIcon, SettingsIcon } from 'lucide-react'
import { toast } from 'sonner'

import { SUPERADMIN, useLogout, useMe } from '@/api/auth'
import { Button } from '@/components/ui/button'

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
  const onConsole = path.startsWith('/admin')

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
      {/* In the console the project register already lists every costing. */}
      {me.data.groups.includes(SUPERADMIN) && !onConsole && (
        <Button variant="bar" size="lg" onClick={() => navigate({ to: '/admin' })}>
          <SettingsIcon />
          Admin
        </Button>
      )}
      <Button
        variant="bar"
        size="lg"
        disabled={logout.isPending}
        onClick={signOut}
      >
        <LogOutIcon />
        Sign out
      </Button>
      <span className="hidden text-xs text-primary-foreground/65 md:inline">
        {me.data.user.email}
      </span>
    </div>
  )
}
