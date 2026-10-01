import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { type AccountType, homeFor, useSignup } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { fieldErrors } from '@/lib/api'

import { AccountTabs } from './AccountTabs'
import { AuthError, AuthShell, Field } from './AuthShell'

export function Signup() {
  const navigate = useNavigate()
  const signup = useSignup()

  const [accountType, setAccountType] = useState<AccountType>('researcher')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // The 422 names the field it is about, so it renders against that field
  // rather than as one message at the top.
  const fields = fieldErrors(signup.error)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    signup.mutate(
      {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        account_type: accountType,
      },
      { onSuccess: (me) => navigate({ to: homeFor(me), replace: true }) },
    )
  }

  return (
    <AuthShell
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AccountTabs value={accountType} onChange={setAccountType} />

      <form onSubmit={submit} className="grid gap-4">
        <AuthError error={signup.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="first_name"
            label="First name"
            value={firstName}
            onChange={setFirstName}
            error={fields.first_name}
            autoComplete="given-name"
            autoFocus
          />
          <Field
            id="last_name"
            label="Last name"
            value={lastName}
            onChange={setLastName}
            error={fields.last_name}
            autoComplete="family-name"
          />
        </div>
        <Field
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          error={fields.email}
          autoComplete="username"
        />
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          error={fields.password}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={signup.isPending}
        >
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
