import type { ApproverGaps } from '@/api/admin-console'
import type { RateTable } from '@/api/admin-lookups'
import type { ReferenceTable } from '@/screens/admin/referenceTables'

export function gapFlags(
  tableId: RateTable | ReferenceTable,
  gaps: ApproverGaps | undefined,
) {
  if (gaps && tableId === 'departments')
    return {
      keys: new Set(gaps.departments_without_head),
      label: 'No head of department',
    }
  if (gaps && tableId === 'faculties')
    return {
      keys: new Set(gaps.faculties_without_dean),
      label: 'No dean',
    }
  return undefined
}
