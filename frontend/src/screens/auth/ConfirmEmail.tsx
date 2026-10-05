import { Link, useSearch } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'
import { useEffect } from 'react'

import { useConfirmSignup } from '@/api/auth'
import { Skeleton } from '@/components/ui/skeleton'

import { AuthError, AuthShell } from './AuthShell'

/** Where the emailed link lands. Confirms, then sends them back to the tab they signed up in. */
export function ConfirmEmail() {
  const { token } = useSearch({ from: '/signup/confirm' })
  const confirm = useConfirmSignup()
  const { mutate } = confirm

  useEffect(() => {
    if (token) mutate(token)
  }, [token, mutate])

  return (
    <AuthShell
      footer={
        <>
          Closed the sign-up page?{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in here
          </Link>
        </>
      }
    >
      {confirm.isSuccess ? (
        <div className="grid justify-items-center gap-3 text-center">
          <CircleCheck className="size-10 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">Email confirmed</h2>
          <p className="text-sm text-muted-foreground">
            Go back to the page where you signed up. It will finish signing you
            in. You can close this tab.
          </p>
        </div>
      ) : confirm.isError || !token ? (
        <AuthError
          error={confirm.error ?? new Error('This link is missing its token.')}
        />
      ) : (
        <div className="grid justify-items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      )}
    </AuthShell>
  )
}
