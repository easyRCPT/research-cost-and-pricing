import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

import { homeFor, useAdminLogin } from '@/api/auth'

import { SignInForm } from './SignInForm'

/**
 * Its own page: no tabs, no card and no way to sign up, so nobody mistakes it
 * for the normal way in.
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
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="rounded-lg border border-white/15 bg-white/5 px-7 py-7">
          <div className="mb-6 flex items-center gap-2.5 text-white">
            <ShieldCheck className="size-4.5 text-white/70" />
            <div>
              <h1 className="text-[15px] leading-tight font-bold">
                Administrator sign-in
              </h1>
              <p className="text-xs text-white/50">
                Lookup tables, user accounts and the audit log.
              </p>
            </div>
          </div>

          <SignInForm attempt={adminLogin} onSubmit={submit} dark />
        </div>

        <Link
          to="/login"
          className="mt-5 flex items-center justify-center gap-1.5 text-[12.5px] text-white/50 transition-colors hover:text-white/85"
        >
          <ArrowLeft className="size-3.5" />
          Back to researcher sign-in
        </Link>
      </div>
    </div>
  )
}
