import createClient from 'openapi-fetch'
import type { paths } from '@/types/api'

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
  // Only matters if VITE_API_URL points at another origin; /api is same-origin.
  credentials: 'include',
})

const SAFE = ['GET', 'HEAD', 'OPTIONS', 'TRACE']

/**
 * Django refuses an unsafe method that cannot show the cookie back to it.
 *
 * The token is readable by script on purpose: proving the request came from a
 * page on this origin is the whole mechanism, and an attacker's page cannot
 * read the cookie to copy it. `/api/auth/csrf/` is what puts it there for a
 * browser nobody has signed in on yet.
 */
api.use({
  onRequest({ request }) {
    if (!SAFE.includes(request.method)) {
      const token = readCookie('csrftoken')
      if (token) request.headers.set('X-CSRFToken', token)
    }
    return request
  },
  onResponse({ request, response }) {
    // The session expired mid-visit: sign in again and come back here.
    const path = new URL(request.url, location.origin).pathname
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      const here = location.pathname + location.search
      location.assign(`/login?redirect=${encodeURIComponent(here)}`)
    }
  },
})

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(status: number, body: unknown) {
    const { message, fields } = readApiError(status, body)
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

/** The envelope drf-standardized-errors wraps every 4xx and 5xx in. */
type ErrorBody = {
  type: 'validation_error' | 'client_error' | 'server_error'
  errors: { code: string; detail: string; attr: string | null }[]
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { errors?: unknown }).errors)
  )
}

function fallbackMessage(status: number): string {
  if (status >= 500) return 'The server is not responding. Try again.'
  return `Request failed (${status}).`
}

function isFieldAttr(attr: string | null): attr is string {
  return attr != null && attr !== 'non_field_errors'
}

function readApiError(status: number, body: unknown) {
  if (!isErrorBody(body))
    return { message: fallbackMessage(status), fields: {} }

  const fields: Record<string, string> = {}
  for (const { attr, detail } of body.errors) {
    if (isFieldAttr(attr) && !(attr in fields)) fields[attr] = detail
  }

  const general = body.errors.find((error) => !isFieldAttr(error.attr))
  const message =
    general?.detail ?? body.errors[0]?.detail ?? fallbackMessage(status)

  return { message, fields }
}
