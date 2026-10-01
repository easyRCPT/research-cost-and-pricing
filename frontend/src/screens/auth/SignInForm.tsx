import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { fieldErrors } from '@/lib/api'

import { AuthError, Field } from './AuthShell'

/** The email and password form both sign-in pages share. */
export function SignInForm({
  attempt,
  onSubmit,
}: {
  /** The sign-in call: what it last said, and whether it is still out. */
  attempt: { error: unknown; isPending: boolean }
  onSubmit: (credentials: { email: string; password: string }) => void
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
      <AuthError error={attempt.error} />
      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        error={fields.email}
        autoComplete="username"
        autoFocus
      />
      <Field
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        error={fields.password}
        autoComplete="current-password"
      />
      <Button type="submit" disabled={attempt.isPending}>
        {attempt.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
