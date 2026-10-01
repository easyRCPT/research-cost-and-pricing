import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { fieldErrors } from '@/lib/api'
import { cn } from '@/lib/utils'

import { AuthError, Field } from './AuthShell'

/** The email and password form both sign-in pages share; `dark` is the admin door's navy. */
export function SignInForm({
  attempt,
  onSubmit,
  dark = false,
}: {
  /** The sign-in call: what it last said, and whether it is still out. */
  attempt: { error: unknown; isPending: boolean }
  onSubmit: (credentials: { email: string; password: string }) => void
  dark?: boolean
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const fields = fieldErrors(attempt.error)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ email, password })
      }}
      className="grid gap-4"
    >
      <AuthError error={attempt.error} dark={dark} />
      <Field
        id="email"
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        error={fields.email}
        autoComplete="username"
        autoFocus
        dark={dark}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        error={fields.password}
        autoComplete="current-password"
        dark={dark}
      />
      <Button
        type="submit"
        size="lg"
        className={cn(
          'mt-1 w-full',
          dark && 'bg-white text-primary hover:bg-white/85',
        )}
        disabled={attempt.isPending}
      >
        {attempt.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
