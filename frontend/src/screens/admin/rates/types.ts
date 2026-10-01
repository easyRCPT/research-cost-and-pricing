/** What the server refused about one staged change: per value field, or the row as a whole. */
export type Refused = {
  id: string
  message: string | null
  fields: Record<string, string>
} | null
