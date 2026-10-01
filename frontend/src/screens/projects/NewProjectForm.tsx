import { useState } from 'react'

import { useCreateProject } from '@/api/projects'
import { FieldRow, Panel } from '@/components/shell'
import { DepartmentSelect } from '@/components/shell/DepartmentSelect'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'
import { ApiError } from '@/lib/api'
import type { Department, ProjectCreate, ProjectRow } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Only what a project cannot exist without: the list needs a name to show, and
 * the engine needs a cost centre. Duration, external party, scheme and the rest
 * are filled in on Project Details, where they already live — asking for them
 * twice is what made the old form feel like it was defining the whole budget.
 */
function startingProject(title: string, department: string): ProjectCreate {
  return {
    title: title.trim(),
    department,
    funder: '',
    chief_investigator: '',
    scheme: '',
    start_year: CURRENT_YEAR,
    start_month: 1,
    end_year: CURRENT_YEAR,
    end_month: 12,
  }
}

interface NewProjectFormProps {
  departments: Department[]
  onCreated: (project: ProjectRow) => void
  onCancel: () => void
}

export function NewProjectForm({
  departments,
  onCreated,
  onCancel,
}: NewProjectFormProps) {
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const create = useCreateProject()

  const complete = title.trim() !== '' && department !== ''

  function submit(event: React.FormEvent) {
    event.preventDefault()
    create.mutate(startingProject(title, department), { onSuccess: onCreated })
  }

  const error = create.error instanceof ApiError ? create.error : null

  return (
    <form onSubmit={submit}>
      <Panel
        title="New project"
        description="Enough to open a costing. Everything else is filled in on Project Details."
      >
        <FieldRow label="Project title" htmlFor="new-title" required>
          <TextInput
            id="new-title"
            className="max-w-lg"
            autoFocus
            value={title}
            onChange={setTitle}
          />
        </FieldRow>

        <FieldRow label="Department" required>
          <DepartmentSelect
            departments={departments}
            value={department}
            onValueChange={setDepartment}
          />
        </FieldRow>

        {error && (
          <p className="mt-2 text-[13px] text-destructive">
            {Object.entries(error.fields).length === 0
              ? error.message
              : Object.entries(error.fields)
                  .map(([field, message]) => `${field}: ${message}`)
                  .join(' · ')}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={!complete || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create and open'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Panel>
    </form>
  )
}
