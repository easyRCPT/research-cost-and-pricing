import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** The public sign-in card: navy masthead, with the admin side door in its corner. */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <header className="flex items-start gap-4 bg-primary px-6 py-4.5 text-primary-foreground">
            <div className="flex-1">
              <h1 className="text-base leading-tight font-bold">
                Research Costing and Pricing Tool
              </h1>
              <p className="text-xs text-primary-foreground/60">
                Research, Innovation and Commercialisation
              </p>
            </div>
            <Link
              to="/admin/login"
              className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-primary-foreground/50 transition-colors hover:text-primary-foreground/85"
            >
              Admin Login
              <ExternalLink className="size-3" />
            </Link>
          </header>
          <div className="px-6 pt-6 pb-7">{children}</div>
        </div>
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          {footer}
        </p>
      </div>
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
  dark = false,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete?: string
  autoFocus?: boolean
  dark?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className={cn('text-[13px]', dark && 'text-white/70')}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-9',
          dark &&
            'border-white/20 bg-white/10 text-white focus-visible:border-white/60 focus-visible:ring-white/20',
        )}
      />
      {error && (
        <p
          id={`${id}-error`}
          className={cn('text-xs', dark ? 'text-white/90' : 'text-bad')}
        >
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
export function AuthError({
  error,
  dark = false,
}: {
  error: unknown
  dark?: boolean
}) {
  if (!error) return null
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Try again.'

  if (dark) {
    return (
      <p
        role="alert"
        className="rounded-md border border-white/20 bg-black/25 px-3 py-2 text-[12.5px] text-white/90"
      >
        {message}
      </p>
    )
  }

  return (
    <Alert
      variant="destructive"
      role="alert"
      className="border-bad/25 bg-bad-bg text-bad"
    >
      <AlertDescription className="text-[13px] font-medium text-bad">
        {message}
      </AlertDescription>
    </Alert>
  )
}
