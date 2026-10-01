import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KeyField, RateTableSpec, ValueField } from '@/screens/admin/rateTables'
import { keyShown, keyText, shown } from '@/screens/admin/stagedChanges'

import { isChanged, type RateLine } from './rateLine'
import { ValueInput } from './ValueInput'

export function KeyCell({
  line,
  field,
  first,
}: {
  line: RateLine
  field: KeyField
  first: boolean
}) {
  return (
    <>
      {line.about && first ? (
        <div className="py-0.5 whitespace-normal">
          <div className="font-medium">{line.about.name}</div>
          {line.about.detail && (
            <div className="text-[12px] text-muted-foreground">
              {line.about.detail}
            </div>
          )}
        </div>
      ) : (
        <span className={cn(line.removed && 'line-through')}>
          {keyShown(field, line.key[field.field])}
        </span>
      )}
      {first && line.added && (
        <Badge variant="secondary" className="ml-2">
          New
        </Badge>
      )}
      {first && line.removed && (
        <Badge variant="destructive" className="ml-2">
          Removed
        </Badge>
      )}
      {first && line.refusal?.message && (
        <div className="mt-0.5 text-[12px] text-destructive">
          {line.refusal.message}
        </div>
      )}
    </>
  )
}

export function ValueCell({
  spec,
  line,
  field,
  undo = false,
}: {
  spec: RateTableSpec
  line: RateLine
  field: ValueField
  /** Offers the row's undo beside what the value was. */
  undo?: boolean
}) {
  return (
    <>
      {line.removed ? (
        <span className="tabular line-through">
          {shown(field, line.values[field.field])}
        </span>
      ) : (
        <ValueInput
          field={field}
          value={line.values[field.field]}
          constant={String(line.key.name ?? '')}
          label={`${field.label} for ${keyText(spec, line.key)}`}
          error={line.refusal?.fields[field.field]}
          onChange={(value) =>
            line.onChange({ ...line.values, [field.field]: value })
          }
        />
      )}
      {line.was && field.field in line.was && (
        <div className="tabular mt-0.5 text-[11.5px] text-muted-foreground">
          was {shown(field, line.was[field.field])}
          {undo && (
            <>
              {' · '}
              <button
                type="button"
                className="cursor-pointer text-primary hover:underline"
                onClick={line.onUndo}
                aria-label={`Undo the change to ${keyText(spec, line.key)}`}
              >
                Undo
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

export function RowActions({
  spec,
  line,
}: {
  spec: RateTableSpec
  line: RateLine
}) {
  const name = keyText(spec, line.key)
  if (isChanged(line))
    return (
      <Button
        size="xs"
        variant="ghost"
        onClick={line.onUndo}
        aria-label={`Undo the change to ${name}`}
      >
        Undo
      </Button>
    )
  if (!line.onRemove) return null
  return (
    <Button
      size="xs"
      variant="ghost"
      className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
      onClick={line.onRemove}
      aria-label={`Remove ${name}`}
    >
      Remove
    </Button>
  )
}
