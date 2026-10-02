import type { CursorPage } from '@/api/cursor'
import type { SearchOption } from '@/components/ui/search-select'
import { api, unwrap } from '@/lib/api'

/** Rows asked for at a time as a picker scrolls. */
const PAGE_SIZE = 25

/** A department by name or code; its faculty rides along as the hint. */
export async function searchDepartments(
  q: string,
  cursor: string | null,
  signal: AbortSignal,
): Promise<CursorPage<SearchOption>> {
  const page = unwrap(
    await api.GET('/api/departments/', {
      params: { query: { q, cursor: cursor ?? undefined, limit: PAGE_SIZE } },
      signal,
    }),
  )
  return {
    ...page,
    results: page.results.map((d) => ({
      value: d.code,
      label: d.name,
      hint: d.faculty,
    })),
  }
}

export async function searchFaculties(
  q: string,
  cursor: string | null,
  signal: AbortSignal,
): Promise<CursorPage<SearchOption>> {
  const page = unwrap(
    await api.GET('/api/faculties/', {
      params: { query: { q, cursor: cursor ?? undefined, limit: PAGE_SIZE } },
      signal,
    }),
  )
  return {
    ...page,
    results: page.results.map((f) => ({ value: f.code, label: f.name })),
  }
}
