import type { SearchOption } from '@/components/ui/search-select'
import { api, unwrap } from '@/lib/api'

/** A department by name or code; its faculty rides along as the hint. */
export async function searchDepartments(
  q: string,
  signal: AbortSignal,
): Promise<SearchOption[]> {
  const found = unwrap(
    await api.GET('/api/departments/', { params: { query: { q } }, signal }),
  )
  return found.map((d) => ({ value: d.code, label: d.name, hint: d.faculty }))
}

export async function searchFaculties(
  q: string,
  signal: AbortSignal,
): Promise<SearchOption[]> {
  const found = unwrap(
    await api.GET('/api/faculties/', { params: { query: { q } }, signal }),
  )
  return found.map((f) => ({ value: f.code, label: f.name }))
}
