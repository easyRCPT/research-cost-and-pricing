import { useMemo, useState } from 'react'
import { PlusIcon } from 'lucide-react'

import { useLookups } from '@/api/lookups'
import { useProjects } from '@/api/projects'
import { DataTable, type DataTableFilter } from '@/components/data-table'
import { PageHead } from '@/components/shell'
import { Button } from '@/components/ui/button'
import type { ProjectRow } from '@/types'
import { projectColumns } from './columns'
import { NewProjectForm } from './NewProjectForm'
import { STATUS_LABELS } from './status'

const FILTERS: DataTableFilter<ProjectRow>[] = [
  { id: 'department', label: 'Department', value: (row) => row.department },
  { id: 'faculty', label: 'Faculty', value: (row) => row.faculty },
  {
    id: 'status',
    label: 'Status',
    value: (row) =>
      row.status === null ? 'No budget' : STATUS_LABELS[row.status],
  },
]

const byId = (row: ProjectRow) => String(row.id)

interface ProjectsScreenProps {
  onOpen: (budgetId: number) => void
}

export function ProjectsScreen({ onOpen }: ProjectsScreenProps) {
  const { data: projects } = useProjects()
  const { data: lookups } = useLookups()
  const [creating, setCreating] = useState(false)

  const columns = useMemo(() => projectColumns(onOpen), [onOpen])

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
          filters={FILTERS}
          flush
        />
      </section>
    </>
  )
}
