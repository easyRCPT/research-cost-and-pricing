import type { ApproverGaps } from '@/api/admin-console'
import type { RateTable } from '@/api/admin-lookups'
import type { ReferenceTable } from '@/screens/admin/referenceTables'

/** The units with nobody to sign for them: departments without a head, faculties without a dean (#121). */
export function gapFlags(
  tableId: RateTable | ReferenceTable,
  gaps: ApproverGaps | undefined,
) {
  if (gaps && tableId === 'departments') return new Set(gaps.departments_without_head)
  if (gaps && tableId === 'faculties') return new Set(gaps.faculties_without_dean)
  return undefined
}
