import { useNavigate } from '@tanstack/react-router'

import { homeFor, useAdminLogin } from '@/api/auth'

import { AuthShell } from './AuthShell'
import { SignInForm } from './SignInForm'

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

  const submit = (credentials: { email: string; password: string }) =>
    adminLogin.mutate(credentials, {
      onSuccess: (me) => navigate({ to: homeFor(me), replace: true }),
    })

  return (
    <AuthShell
      admin
      title="Administrator sign in"
      intro="For Research, Innovation and Commercialisation staff who administer the tool."
    >
      <SignInForm attempt={adminLogin} onSubmit={submit} />
    </AuthShell>
  )
}
