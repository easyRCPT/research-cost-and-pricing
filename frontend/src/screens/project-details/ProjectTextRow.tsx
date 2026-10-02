import { FieldRow } from '@/components/shell'
import {
  SettledTextareaInput,
  SettledTextInput,
} from '@/components/ui/text-input'
import type { ProjectInfo } from '@/types'

type TextField = {
  [K in keyof ProjectInfo]: ProjectInfo[K] extends string ? K : never
}[keyof ProjectInfo]

interface ProjectTextRowProps {
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
  field: TextField
  label: string
  id: string
  required?: boolean
  hint?: string
  placeholder?: string
  /** Set for a multi-line field. */
  rows?: number
}

/** A project detail typed as text, one line or several. */
export function ProjectTextRow({
  project,
  onChange,
  field,
  label,
  id,
  required,
  hint,
  placeholder,
  rows,
}: ProjectTextRowProps) {
  const input = {
    id,
    className: 'max-w-lg',
    placeholder,
    value: project[field],
    onCommit: (value: string) => onChange({ [field]: value }),
  }

  return (
    <FieldRow label={label} htmlFor={id} required={required} hint={hint}>
      {rows ? (
        <SettledTextareaInput {...input} rows={rows} />
      ) : (
        <SettledTextInput {...input} />
      )}
    </FieldRow>
  )
}
