import createClient from 'openapi-fetch'
import type { paths } from '@/types/api'

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
})

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
