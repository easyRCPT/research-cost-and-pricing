import { useBudget } from './detail'

/** What Project Details still needs before the costing and pricing screens open. */
export function useMissingDetails(): string[] {
  const { data: budget } = useBudget()
  const project = budget.project_info

  return [
    project.title.trim() === '' && 'project title',
    project.cost_centre === '' && 'department',
    (project.end_year === null || project.end_month === null) && 'end date',
  ].filter((label) => label !== false)
}
