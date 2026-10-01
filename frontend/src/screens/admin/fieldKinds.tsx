import type { ReactNode } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { OptionSelect } from '@/components/ui/option-select'
import { ConstantInput } from '@/screens/admin/rates/ConstantInput'

export type FieldKind = 'text' | 'number' | 'boolean' | 'constant' | 'faculty'

/** A form's control: it holds what was typed, before it is read. */
export interface EntryProps {
  value: string | boolean
  label: string
  error?: string
  /** What a `faculty` is picked from. */
  options: { value: string; label: string }[]
  onChange: (value: string | boolean) => void
}

/** A rate row's control: it holds the value as the table does. */
export interface InputProps {
  value: unknown
  label: string
  /** For a number: the step the field moves by. */
  step?: number
  /** The constant's name, for a `constant`. */
  constant: string
  onChange: (value: unknown) => void
}

interface Kind {
  /** Only the kinds a rate table holds have one. */
  input?: (props: InputProps) => ReactNode
  entry: (props: EntryProps) => ReactNode
  /** What an empty form holds. */
  blank: string | boolean
  /** Whether the label sits beside the control rather than above it. */
  inline?: boolean
  parse: (raw: unknown) => unknown
  show: (value: unknown) => string
  align?: 'text-right'
}

const dashed = (value: unknown) =>
  value === '' || value == null ? '—' : String(value)

const rawEntry = (type: 'text' | 'number') =>
  function RawEntry({ value, label, error, onChange }: EntryProps) {
    return (
      <Input
        className="h-8 min-w-40"
        type={type}
        value={String(value)}
        aria-label={label}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

/** What a field of each kind does. A new kind is one more entry. */
export const KINDS: Record<FieldKind, Kind> = {
  text: {
    input: ({ value, label, onChange }) => (
      <Input
        className="h-8 min-w-48"
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      />
    ),
    entry: rawEntry('text'),
    blank: '',
    parse: (raw) => (raw == null ? '' : String(raw)),
    show: dashed,
  },
  number: {
    input: ({ value, label, step, onChange }) => (
      <NumberInput
        className="tabular ml-auto h-8 w-36 text-right"
        step={step}
        min={0}
        value={Number(value)}
        onChange={onChange}
        aria-label={label}
      />
    ),
    entry: rawEntry('number'),
    blank: '',
    parse: Number,
    show: dashed,
    align: 'text-right',
  },
  boolean: {
    input: ({ value, label, onChange }) => (
      <Checkbox
        checked={Boolean(value)}
        onCheckedChange={(next) => onChange(next === true)}
        aria-label={label}
      />
    ),
    entry: ({ value, label, onChange }) => (
      <Checkbox
        checked={value === true}
        onCheckedChange={(next) => onChange(next === true)}
        aria-label={label}
      />
    ),
    blank: false,
    inline: true,
    parse: Boolean,
    show: (value) => (value ? 'Yes' : 'No'),
  },
  constant: {
    input: ({ value, label, constant, onChange }) => (
      <ConstantInput
        name={constant}
        value={Number(value)}
        label={label}
        onChange={onChange}
      />
    ),
    entry: rawEntry('text'),
    blank: '',
    parse: Number,
    show: dashed,
  },
  faculty: {
    entry: ({ value, label, error, options, onChange }) => (
      <OptionSelect
        value={String(value)}
        onValueChange={onChange}
        options={options}
        placeholder="Pick a faculty"
        size="sm"
        className="min-w-56 bg-white"
        aria-label={label}
        aria-invalid={!!error}
      />
    ),
    blank: '',
    parse: String,
    show: dashed,
  },
}
