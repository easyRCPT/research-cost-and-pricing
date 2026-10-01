import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import { type AccountType, homeFor, useLogin } from '@/api/auth'

import { AccountTabs } from './AccountTabs'
import { AuthShell } from './AuthShell'
import { SignInForm } from './SignInForm'

export function Login() {
  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/login' })
  const login = useLogin()

  const [accountType, setAccountType] = useState<AccountType>('researcher')

  const submit = (credentials: { email: string; password: string }) =>
    login.mutate(
      { ...credentials, account_type: accountType },
      {
        // Back to whatever they were trying to reach, or wherever their
        // account belongs.
        onSuccess: (me) =>
          navigate({ to: redirect ?? homeFor(me), replace: true }),
      },
    )

  return (
    <AuthShell
      footer={
        <>
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <AccountTabs value={accountType} onChange={setAccountType} />

      <SignInForm attempt={login} onSubmit={submit} />
    </AuthShell>
  )
}
