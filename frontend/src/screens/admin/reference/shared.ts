import { fieldErrors, messageOf } from '@/lib/api'

export type Row = Record<string, unknown>
export type Faculty = { code: string; name: string }
export type Refusal = { message: string; fields: Record<string, string> }

export const refusalOf = (error: unknown): Refusal => ({
  message: messageOf(error, 'Not saved. Try again.'),
  fields: fieldErrors(error),
})

/** The server's complaint about a field; it names the faculty field `faculty`. */
export const fieldError = (
  refusal: Refusal | null,
  f: { field: string; kind: string },
) =>
  refusal?.fields[f.field] ??
  (f.kind === 'faculty' ? refusal?.fields.faculty : undefined)

export const facultyOptions = (faculties: Faculty[]) =>
  faculties.map((f) => ({ value: f.code, label: f.name }))

export const text = (value: unknown) =>
  value === null || value === undefined ? '' : String(value)
