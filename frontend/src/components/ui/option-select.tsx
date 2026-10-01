import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OptionSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: readonly (string | { value: string; label: string })[]
  placeholder?: string
  size?: 'sm' | 'default'
  className?: string
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

/** A select over a flat list of options; a plain string is its own value and label. */
export function OptionSelect({
  value,
  onValueChange,
  options,
  placeholder,
  size,
  className,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: OptionSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        size={size}
        className={className}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const o =
            typeof option === 'string'
              ? { value: option, label: option }
              : option
          return (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
