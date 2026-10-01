import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Faculty } from '@/screens/admin/reference/shared'
import type { ReferenceField } from '@/screens/admin/referenceTables'

export function FieldInput({
  field,
  value,
  faculties,
  label,
  error,
  onChange,
}: {
  field: ReferenceField
  value: string
  faculties: Faculty[]
  label: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-0.5">
      {field.kind === 'faculty' ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            size="sm"
            className="min-w-56 bg-white"
            aria-label={label}
            aria-invalid={!!error}
          >
            <SelectValue placeholder="Pick a faculty" />
          </SelectTrigger>
          <SelectContent>
            {faculties.map((faculty) => (
              <SelectItem key={faculty.code} value={faculty.code}>
                {faculty.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className="h-8 min-w-40"
          type={field.kind === 'number' ? 'number' : 'text'}
          value={value}
          aria-label={label}
          aria-invalid={!!error}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error && <span className="text-[12px] text-destructive">{error}</span>}
    </div>
  )
}
