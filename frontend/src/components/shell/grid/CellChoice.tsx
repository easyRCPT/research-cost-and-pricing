import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { cellField } from './cellField'

interface CellChoiceProps {
  value: string
  options: readonly string[]
  /** Every option the column could ever hold, when `options` depends on another
   *  cell. Sizing against these keeps the column from resizing later. */
  sizeOptions?: readonly string[]
  placeholder?: string
  disabled?: boolean
  className?: string
  onChange: (value: string) => void
}

/** Where a choice column stops growing and starts truncating instead. */
const choiceMaxWidth = 'max-w-56'

// The trigger line-clamps its value; in a cell we want one truncated line.
const choiceValue =
  '*:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:block ' +
  '*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate'

export function CellChoice({
  value,
  options,
  sizeOptions = options,
  placeholder,
  disabled,
  className,
  onChange,
}: CellChoiceProps) {
  return (
    // The invisible options alone size the column, so it opens at the width of
    // the longest thing it can ever hold and stays there. The trigger is taken
    // out of flow because an in-flow one measures as wide as its own value, and
    // the column would jump the first time a long value was picked.
    <div className={cn('relative h-8', className)}>
      {sizeOptions.map((option) => (
        <span
          key={option}
          aria-hidden
          className={cn(
            'invisible block h-0 pr-8 pl-2 whitespace-nowrap',
            // The sizers reserve the column's widest value. On paper nothing
            // is going to be picked, so the cell can be as wide as it reads.
            'print:hidden',
            choiceMaxWidth,
          )}
        >
          {option}
        </span>
      ))}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          title={value || undefined}
          className={cn(
            cellField,
            choiceValue,
            'absolute inset-0 justify-between',
            // Back into flow once the sizers are gone, and without the chevron.
            'print:static print:inset-auto print:[&>svg]:hidden',
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          sideOffset={0}
          // Clear of the shared min-width floor, which would push a narrow
          // column's list past its edge.
          className="min-w-0 rounded-md"
        >
          {options.map((option) => (
            // Padding sits on the item, not the content, so an option measures
            // no wider than the sizer that reserved it; longer ones wrap.
            <SelectItem
              key={option}
              value={option}
              className="pr-6 pl-1 text-[13px]"
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
