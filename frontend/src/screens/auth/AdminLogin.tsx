import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { homeFor, useAdminLogin } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { AuthError, AuthShell, Field } from './AuthShell'

/**
 * Its own page: no tabs, and no way to sign up.
 *
 * Nothing self-serves the superadmin group, and the server answers 403 for
 * every failure here, so a correct password for an ordinary account looks the
 * same as a wrong one (#42).
 */
export function AdminLogin() {
  const navigate = useNavigate()
  const adminLogin = useAdminLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const fields = adminLogin.error instanceof ApiError ? adminLogin.error.fields : {}

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    adminLogin.mutate(
      { email, password },
      { onSuccess: (me) => navigate({ to: homeFor(me), replace: true }) },
    )
  }

  return (
    <AuthShell
      admin
      title="Administrator sign in"
      intro="For Research, Innovation and Commercialisation staff who administer the tool."
    >
      <form onSubmit={submit} className="grid gap-4">
        <AuthError error={adminLogin.error} />
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
        <Button type="submit" disabled={adminLogin.isPending}>
          {adminLogin.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
