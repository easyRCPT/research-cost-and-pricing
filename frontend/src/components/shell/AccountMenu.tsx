import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLogout, useMe } from '@/api/auth'

/**
 * Who is signed in, and the way out. Clears the cache only after leaving, or
 * the guards refetch `me` on the way out and the sign-in screen renders twice.
 */
export function AccountMenu() {
  const me = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
