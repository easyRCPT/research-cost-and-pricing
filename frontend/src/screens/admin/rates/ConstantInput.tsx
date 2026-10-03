import { useId, useState } from 'react'

import { Input } from '@/components/ui/input'
import { asPercent, PERCENT_CONSTANTS } from '@/lib/format/constants'

/**
 * What was typed into a constant, read as a value (#151): a decimal, or for a
 * rate a percentage such as `30%`, which is its decimal. Input reading only:
 * whether the value is in range is the server's to say when the set is saved,
 * and it says so against the row.
 */
function readConstant(
  raw: string,
  percent: boolean,
): { value?: number; error?: string } {
  const typed = raw.trim()
  if (typed === '') return { error: 'Enter a value.' }
  if (typed.endsWith('%')) {
    if (!percent) return { error: 'Enter this as a number, not a percentage.' }
    const number = Number(typed.slice(0, -1).trim())
    if (!Number.isFinite(number))
      return {
        error: 'Enter a decimal such as 0.30, or a percentage such as 30%.',
      }
    return { value: Number((number / 100).toFixed(8)) }
  }
  const number = Number(typed)
  if (!Number.isFinite(number)) {
    return {
      error: percent
        ? 'Enter a decimal such as 0.30, or a percentage such as 30%.'
        : 'Enter a number.',
    }
  }
  return { value: number }
}

export function ConstantInput({
  name,
  value,
  label,
  refusal,
  refusalId,
  onChange,
}: {
  name: string
  value: number
  label: string
  /** The server's complaint, which `ValueInput` shows under this with `refusalId`. */
  refusal?: string
  refusalId?: string
  onChange: (value: number) => void
}) {
  const percent = PERCENT_CONSTANTS.has(name)
  // What is being typed, held while the field has focus so "30%" isn't
  // rewritten as 0.3 under the cursor.
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()

  return (
    <div className="grid justify-items-start gap-0.5">
      <div className="flex items-center gap-2">
        <Input
          className="tabular h-7 w-32 text-right"
          inputMode="decimal"
          value={draft ?? String(value)}
          aria-label={label}
          aria-invalid={error || refusal ? true : undefined}
          aria-describedby={error ? errorId : refusal ? refusalId : undefined}
          onFocus={() => setDraft(String(value))}
          onChange={(event) => {
            setDraft(event.target.value)
            const read = readConstant(event.target.value, percent)
            setError(read.error ?? null)
            if (read.value !== undefined) onChange(read.value)
          }}
          onBlur={() => {
            if (!error) setDraft(null)
          }}
        />
        {/* Held open when empty too, so every constant's field lines up. */}
        <span className="tabular w-16 text-left text-muted-foreground">
          {percent && `= ${asPercent(value)}`}
        </span>
      </div>
      {error && (
        <span id={errorId} className="text-[12px] text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
