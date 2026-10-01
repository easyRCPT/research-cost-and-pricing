import type { ProjectQuery } from '@/api/projects'
import type { FilterOption, FilterState } from '@/components/data-table/filtering'
import { statusLabel } from '@/lib/status'
import type { Status } from '@/types'
import type { components } from '@/types/api'

type ProjectFilters = components['schemas']['ProjectFilters']

const NO_BUDGET = 'none'

/** The filter menus' values as the server counts them, statuses by their label. */
export function projectFilterOptions(
  values: ProjectFilters | undefined,
): Record<string, FilterOption[]> {
  if (!values) return {}
  return {
    ...values,
    status: values.status.map((option) => ({
      ...option,
      label: statusLabel(
        option.value === NO_BUDGET ? null : (option.value as Status),
      ),
    })),
  }
}

/** The table's filters as query parameters; their ids are the parameters' names. */
export const projectFilterQuery = ({
  status,
  faculty,
  department,
  owner,
}: FilterState): ProjectQuery => ({
  status: status as ProjectQuery['status'],
  faculty,
  department,
  owner,
})
