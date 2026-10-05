import { Link, useNavigate } from '@tanstack/react-router'
import { MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  type AccountType,
  homeFor,
  useResendSignup,
  useSignup,
  useSignupStatus,
} from '@/api/auth'
import { Button } from '@/components/ui/button'
import { fieldErrors } from '@/lib/api'

import { AccountTabs } from './AccountTabs'
import { AuthError, AuthShell, Field } from './AuthShell'

export function Signup() {
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
    signup.mutate({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      account_type: accountType,
    })
  }

  if (signup.data) return <CheckEmail email={signup.data.email} />

  return (
    <AuthShell
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
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

/** Waits here while the link is opened, in this tab's browser or anywhere else. */
function CheckEmail({ email }: { email: string }) {
  const navigate = useNavigate()
  const status = useSignupStatus(true)
  const resend = useResendSignup()

  useEffect(() => {
    if (status.data) navigate({ to: homeFor(status.data), replace: true })
  }, [status.data, navigate])

  return (
    <AuthShell
      footer={
        <>
          Wrong address?{' '}
          <a
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Start again
          </a>
        </>
      }
    >
      <div className="grid justify-items-center gap-3 text-center">
        <MailCheck className="size-10 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a link to{' '}
          <span className="font-medium text-foreground">{email}</span>. Open it
          to confirm your address. Keep this page open: it finishes signing you
          up as soon as you do.
        </p>
        <AuthError error={resend.error ?? status.error} />
        <Button
          variant="outline"
          className="mt-2"
          disabled={resend.isPending || resend.isSuccess}
          onClick={() => resend.mutate()}
        >
          {resend.isSuccess ? 'Sent again' : 'Send it again'}
        </Button>
      </div>
    </AuthShell>
  )
}
