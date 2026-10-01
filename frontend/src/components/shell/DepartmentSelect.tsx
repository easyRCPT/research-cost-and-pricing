import { searchDepartments } from '@/api/org-search'
import { SearchSelect } from '@/components/ui/search-select'
import type { Department } from '@/types'

/**
 * A department picker searched by name; the value is the department's code.
 * `departments` only names the one already chosen, since the list is far too
 * long to offer whole.
 */
export function DepartmentSelect({
  departments,
  value,
  onValueChange,
}: {
  departments: Department[]
  value: string
  onValueChange: (code: string) => void
}) {
  const chosen = departments.find((d) => d.code === value)

  return (
    <SearchSelect
      value={
        value
          ? {
              value,
              label: chosen?.name ?? value,
              hint: chosen?.faculty,
            }
          : null
      }
      onChange={(option) => onValueChange(option.value)}
      searchKey="departments"
      search={searchDepartments}
      placeholder="Select a department"
      className="max-w-lg"
      aria-label="Department"
    />
  )
}
