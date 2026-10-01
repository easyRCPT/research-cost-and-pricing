import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DataTableDateRangeMenuProps {
  label: string
  /** The first and last day kept, as YYYY-MM-DD; an empty one is open. */
  range: string[]
  onRange: (range: string[]) => void
}

/** A date range filter: a trigger like the list filters', over a From and a To day. */
export function DataTableDateRangeMenu({
  label,
  range,
  onRange,
}: DataTableDateRangeMenuProps) {
  const [from = '', to = ''] = range
  const set = (next: [string, string]) =>
    onRange(next[0] || next[1] ? next : [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-card px-1.5! font-normal"
        >
          {label}
          <ChevronDownIcon
            data-icon="inline-end"
            className="text-muted-foreground transition-transform group-aria-expanded/button:rotate-180"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-auto min-w-56 gap-3 p-3">
        <div className="grid gap-1">
          <Label htmlFor={`${label}-from`}>From</Label>
          <Input
            id={`${label}-from`}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => set([event.target.value, to])}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${label}-to`}>To</Label>
          <Input
            id={`${label}-to`}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => set([from, event.target.value])}
          />
        </div>
        <Button
          variant="link"
          size="xs"
          className="justify-self-start px-0 text-xs"
          disabled={!from && !to}
          onClick={() => onRange([])}
        >
          Clear dates
        </Button>
      </PopoverContent>
    </Popover>
  )
}
