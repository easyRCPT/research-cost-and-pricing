import { useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { homeFor, useLogin, type AccountType } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { AccountTabs } from './AccountTabs'
import { AuthError, AuthShell, Field } from './AuthShell'

export function Login() {
  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/login' })
  const login = useLogin()

  const [accountType, setAccountType] = useState<AccountType>('researcher')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const fields = login.error instanceof ApiError ? login.error.fields : {}

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    login.mutate(
      { email, password, account_type: accountType },
      {
        // Back to whatever they were trying to reach, or wherever their
        // account belongs.
        onSuccess: (me) =>
          navigate({ to: redirect ?? homeFor(me), replace: true }),
      },
    )
  }

  return (
    <AuthShell
      title="Sign in"
      intro="Use your University email address."
      footer={
        <p className="text-muted-foreground">
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <AccountTabs value={accountType} onChange={setAccountType} />

      <form onSubmit={submit} className="grid gap-4">
        <AuthError error={login.error} />
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
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
