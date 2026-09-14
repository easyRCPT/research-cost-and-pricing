import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NumberSelectProps {
  label: string
  value: number | null
  options: readonly { value: number; label: string }[]
  placeholder?: string
  disabled?: boolean
  onChange: (value: number) => void
}

export function NumberSelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: NumberSelectProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Select
        value={value === null ? '' : String(value)}
        disabled={disabled}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
