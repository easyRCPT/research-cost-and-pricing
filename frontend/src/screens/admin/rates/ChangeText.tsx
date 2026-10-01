import { Badge } from '@/components/ui/badge'
import { asPercent, PERCENT_CONSTANTS } from '@/lib/format/constants'
import type { RateTableSpec, ValueField } from '@/screens/admin/rateTables'
import { shown, type Staged } from '@/screens/admin/stagedChanges'

const signedPercent = (fraction: number) =>
  `${fraction > 0 ? '+' : fraction < 0 ? '−' : ''}${Math.abs(fraction * 100).toLocaleString('en-AU', { maximumFractionDigits: 1 })}%`

export function ChangeText({
  spec,
  change,
}: {
  spec: RateTableSpec
  change: Staged
}) {
  const fields = spec.values.filter(
    (v) => change.op === 'delete' || v.field in change.value,
  )
  // A rate constant reads as a percentage here, as it does beside its input.
  const percent = PERCENT_CONSTANTS.has(String(change.key.name ?? ''))
  const show = (field: ValueField, value: unknown) =>
    percent && field.kind === 'constant'
      ? asPercent(Number(value))
      : shown(field, value)
  switch (change.op) {
    case 'update':
      return (
        <span className="tabular flex flex-wrap gap-x-3">
          {fields.map((field) => {
            const was = change.was[field.field]
            const now = change.value[field.field]
            return (
              <span key={field.field}>
                {field.label} {show(field, was)} → {show(field, now)}
                {/* Shown so a slip of the keyboard (a rate 100 times too big) stands out. */}
                {(field.kind === 'number' || field.kind === 'constant') &&
                  Number(was) !== 0 && (
                    <span className="ml-1.5 text-muted-foreground">
                      ({signedPercent(Number(now) / Number(was) - 1)})
                    </span>
                  )}
              </span>
            )
          })}
        </span>
      )
    case 'create':
      return (
        <span className="tabular">
          <Badge variant="secondary">Added</Badge>{' '}
          {fields
            .map(
              (field) =>
                `${field.label} ${shown(field, change.value[field.field])}`,
            )
            .join(' · ')}
        </span>
      )
    case 'delete':
      return (
        <span className="tabular">
          <Badge variant="destructive">Removed</Badge> was{' '}
          {fields
            .map((field) => shown(field, change.was[field.field]))
            .join(' · ')}
        </span>
      )
  }
}
