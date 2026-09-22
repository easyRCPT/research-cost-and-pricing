import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The frame the three doors share.
 *
 * Signed out, there is no sidebar and no project, so the masthead is the whole
 * of the chrome. It carries the same band as the rest of the app, because a
 * sign-in page that looks like a different product is how people decide a link
 * was a phishing attempt.
 */
export function AuthShell({
  title,
  intro,
  children,
  footer,
  admin = false,
}: {
  title: string
  intro?: string
  children: ReactNode
  footer?: ReactNode
  admin?: boolean
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">
              Research Costing and Pricing Tool
            </h1>
            <p className="text-xs text-primary-foreground/70">
              Research, Innovation and Commercialisation
            </p>
          </div>
          {!admin && (
            <Link
              to="/admin/login"
              className="text-xs font-medium text-primary-foreground/80 underline-offset-4 hover:underline"
            >
              Admin Login
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-6 py-12">
        <h2 className="text-xl font-semibold">{title}</h2>
        {intro && (
          <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
        )}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-sm">{footer}</div>}
      </main>
    </div>
  )
}

/** One labelled control, with the server's complaint about it underneath. */
export function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  autoFocus,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete?: string
  autoFocus?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * What went wrong, when it was not about one field.
 *
 * The server says the same thing for a wrong password, an unknown address, a
 * deactivated account and the wrong tab, on purpose (#42), so this renders
 * whatever it was given rather than trying to be more helpful.
 */
export function AuthError({ error }: { error: unknown }) {
  if (!error) return null
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Try again.'
  return (
    <Alert variant="destructive" role="alert" className="mb-4">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
