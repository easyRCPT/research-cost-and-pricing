import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'

import {
  useCreateProject,
  useProjectFilters,
  useProjects,
} from '@/api/projects'
import {
  DataTable,
  type DataTableFilter,
  useRemote,
} from '@/components/data-table'
import { PageHead } from '@/components/shell'
import { RowsSkeleton } from '@/components/shell/skeleton/RowsSkeleton'
import { Button } from '@/components/ui/button'
import { statusLabel } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { ProjectRow } from '@/types'

import { projectColumns } from './columns'
import { projectFilterOptions, projectFilterQuery } from './filters'

const FILTERS: DataTableFilter<ProjectRow>[] = [
  { id: 'department', label: 'Department', value: (row) => row.department },
  { id: 'faculty', label: 'Faculty', value: (row) => row.faculty },
  { id: 'status', label: 'Status', value: (row) => statusLabel(row.status) },
]

const byId = (row: ProjectRow) => String(row.id)

interface ProjectsScreenProps {
  onOpen: (projectId: number) => void
}

export function ProjectsScreen({ onOpen }: ProjectsScreenProps) {
  const paged = useRemote()
  const projects = useProjects({
    ...projectFilterQuery(paged.filters),
    ...paged.query,
  })
  const values = useProjectFilters({
    ...projectFilterQuery(paged.filters),
    q: paged.query.q,
  }).data
  const options = useMemo(() => projectFilterOptions(values), [values])
  const create = useCreateProject()

  const columns = useMemo(
    () =>
      projectColumns<ProjectRow>({
        open: (row) => onOpen(row.id),
        openable: (row) => row.budget_id !== null,
      }),
    [onOpen],
  )

  return (
    <>
      <PageHead
        // TODO: "Your projects" once auth scopes the list. Until then it is
        // everyone's, and the heading should not pretend otherwise.
        title="Projects"
        subtitle="Every costing started here, and what it is priced at."
        right={
          <Button onClick={() => setCreating(true)} disabled={creating}>
            <PlusIcon />
            New project
          </Button>
        }
      />

      {creating && (
        <div className="mb-6">
          <NewProjectForm
            departments={lookups.departments}
            onCreated={(project) => {
              setCreating(false)
              if (project.budget_id !== null) onOpen(project.budget_id)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      <section className="overflow-hidden rounded-lg border bg-card">
        <DataTable
          columns={columns}
          rows={projects}
          getRowId={byId}
          emptyMessage="No projects yet. Start one with New project."
          sortable
          searchable
          hideable
          filters={FILTERS}
          flush
        />
      </section>
    </>
  )
}
