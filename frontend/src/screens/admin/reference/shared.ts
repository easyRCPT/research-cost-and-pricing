import { ApiError } from '@/lib/api'

export type Row = Record<string, unknown>
export type Faculty = { code: string; name: string }
export type Refusal = { message: string; fields: Record<string, string> }

export const refusalOf = (error: unknown): Refusal =>
  error instanceof ApiError
    ? { message: error.message, fields: error.fields }
    : { message: 'Not saved. Try again.', fields: {} }

// A wide table scrolls sideways, and the row's name and its buttons (or the
// question a save is asking) must stay in view while it does.
export const PIN_LEFT = 'sticky left-0 z-[1]'
export const PIN_RIGHT = 'sticky right-0 z-[1]'

export const text = (value: unknown) =>
  value === null || value === undefined ? '' : String(value)
