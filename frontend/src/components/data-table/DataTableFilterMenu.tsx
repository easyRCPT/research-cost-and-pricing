import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollViewport } from '@/components/ui/scroll-indicator'
import type { FilterOption } from './filtering'

interface DataTableFilterMenuProps {
  label: string
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string, checked: boolean) => void
  onSet: (values: string[]) => void
}

/** One categorical filter: a white trigger over a list of values that apply as they are ticked. */
export function DataTableFilterMenu({
  label,
  options,
  selected,
  onToggle,
  onSet,
}: DataTableFilterMenuProps) {
  const none = selected.length === 0
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="bg-card px-1.5! font-normal">
          {label}
          <ChevronDownIcon
            data-icon="inline-end"
            className="text-muted-foreground transition-transform group-aria-expanded/button:rotate-180"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto max-w-100 min-w-56 flex-col p-0">
        <ScrollViewport className="max-h-[min(18rem,var(--radix-popover-content-available-height)-3rem)] p-1">
          {options.map((option) => {
            const checked = selected.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={option.count === 0 && !checked}
                data-checked={checked || undefined}
                onClick={() => onToggle(option.value, !checked)}
                className="flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-2 pl-1.5 text-left text-sm outline-none select-none hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-50 data-checked:not-hover:bg-primary/5"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors in-data-checked:border-primary in-data-checked:bg-primary in-data-checked:text-primary-foreground">
                  {checked && <CheckIcon className="size-3.5" />}
                </span>
                <span className="flex-1 truncate">{option.value}</span>
                <span className="tabular text-muted-foreground">
                  ({option.count})
                </span>
              </button>
            )
          })}
        </ScrollViewport>
        <footer className="flex items-center justify-between gap-3 border-t px-3 py-1.5 text-xs text-muted-foreground">
          <span className="tabular">Selected: {selected.length}</span>
          <Button
            variant="link"
            size="xs"
            className="px-0 text-xs"
            onClick={() =>
              onSet(none ? options.map((option) => option.value) : [])
            }
          >
            {none ? 'Select all' : 'Clear all'}
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  )
}
