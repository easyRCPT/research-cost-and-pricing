import { Td } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { KINDS } from '@/screens/admin/fieldKinds'
import type { RateTableSpec } from '@/screens/admin/rateTables'
import { type Key, keyText, shown, type Values } from '@/screens/admin/stagedChanges'

import { ValueInput } from './ValueInput'

export function RateRow({
  spec,
  rowKey,
  about,
  values,
  was = null,
  added = false,
  removed = false,
  refusal,
  onChange,
  onRemove,
  onUndo,
}: {
  spec: RateTableSpec
  rowKey: Key
  about?: { name: string; detail?: string }
  values: Values
  was?: Values | null
  added?: boolean
  removed?: boolean
  refusal: string | null
  onChange: (values: Values) => void
  onRemove?: () => void
  onUndo: () => void
}) {
  const name = keyText(spec, rowKey)
  const changed = was !== null || added || removed

  return (
    <tr
      className={cn(
        changed && 'bg-amber-50',
        removed && 'text-muted-foreground',
        refusal && 'bg-destructive/10',
      )}
      aria-invalid={refusal ? true : undefined}
    >
      {spec.key.map((k, i) => (
        <Td key={k.field}>
          {about && i === 0 ? (
            <div className="max-w-[46ch] py-0.5 whitespace-normal">
              <div className="font-medium">{about.name}</div>
              {about.detail && (
                <div className="text-[12px] text-muted-foreground">
                  {about.detail}
                </div>
              )}
            </div>
          ) : (
            <span className={cn(removed && 'line-through')}>
              {rowKey[k.field] === null || rowKey[k.field] === ''
                ? '—'
                : String(rowKey[k.field])}
            </span>
          )}
          {i === 0 && added && (
            <Badge variant="secondary" className="ml-2">
              New
            </Badge>
          )}
          {i === 0 && removed && (
            <Badge variant="destructive" className="ml-2">
              Removed
            </Badge>
          )}
          {i === 0 && refusal && (
            <div className="mt-0.5 text-[12px] text-destructive">{refusal}</div>
          )}
        </Td>
      ))}
      {spec.values.map((field) => (
        <Td
          key={field.field}
          className={KINDS[field.kind].align}
        >
          {removed ? (
            <span className="tabular line-through">
              {shown(field, values[field.field])}
            </span>
          ) : (
            <ValueInput
              field={field}
              value={values[field.field]}
              constant={String(rowKey.name ?? '')}
              label={`${field.label} for ${name}`}
              onChange={(value) =>
                onChange({ ...values, [field.field]: value })
              }
            />
          )}
          {was && field.field in was && (
            <div className="tabular mt-0.5 text-[11.5px] text-muted-foreground">
              was {shown(field, was[field.field])}
            </div>
          )}
        </Td>
      ))}
      <Td className="w-40">
        {changed ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onUndo}
            aria-label={`Undo the change to ${name}`}
          >
            Undo
          </Button>
        ) : (
          onRemove && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              aria-label={`Remove ${name}`}
            >
              Remove
            </Button>
          )
        )}
      </Td>
    </tr>
  )
}
