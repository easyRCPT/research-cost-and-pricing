import { useId } from 'react'

import { cn } from '@/lib/utils'
import { KINDS } from '@/screens/admin/fieldKinds'
import type { ValueField } from '@/screens/admin/rateTables'

export function ValueInput({
  field,
  value,
  constant,
  label,
  error,
  onChange,
}: {
  field: ValueField
  value: unknown
  /** The constant's name, for a `constant` field. */
  constant: string
  label: string
  /** What the server refused about this value. */
  error?: string
  onChange: (value: unknown) => void
}) {
  const errorId = useId()
  const { input: Control, align } = KINDS[field.kind]
  return (
    Control && (
      <>
        <Control
          value={value}
          label={label}
          step={field.step}
          constant={constant}
          error={error}
          errorId={errorId}
          onChange={onChange}
        />
        {error && (
          <div
            id={errorId}
            className={cn(
              'mt-0.5 max-w-[40ch] text-[12px] whitespace-normal text-destructive',
              align && 'ml-auto',
            )}
          >
            {error}
          </div>
        )}
      </>
    )
  )
}
