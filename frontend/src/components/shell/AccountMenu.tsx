import { useNavigate } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLogout, useMe } from '@/api/auth'

/**
 * Who is signed in, and the way out.
 *
 * Navigating before clearing is deliberate: clearing first leaves the guards
 * mounted over an empty cache, so they ask for `me` again on the way out and
 * the sign-in screen renders twice.
 */
export function AccountMenu() {
  const me = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  if (!me.data) return null

  const signOut = () => {
    navigate({ to: '/login', replace: true })
    logout.mutate()
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-primary-foreground/65 md:inline">
        {me.data.user.email}
      </span>
      <Button
        variant="outline"
        size="lg"
        disabled={logout.isPending}
        className="border-primary-foreground/55 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        onClick={signOut}
      >
        <LogOutIcon />
        Sign out
      </Button>
    </div>
  )
}
