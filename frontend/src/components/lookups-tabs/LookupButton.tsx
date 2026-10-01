import type { EditorScreen } from '@/components/shell'
import { Button } from '@/components/ui/button'

export const LOOKUP_SCREEN = 'lookups'

interface LookupButtonProps {
  open: boolean
  handleClick: (screen: EditorScreen | typeof LOOKUP_SCREEN) => void
}

export function LookupButton({ open, handleClick }: LookupButtonProps) {
  return (
    <Button
      variant="bar"
      size="lg"
      aria-pressed={open}
      className={
        open
          ? 'border-primary-foreground bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary'
          : undefined
      }
      onClick={() => handleClick(open ? 'details' : LOOKUP_SCREEN)}
    >
      Lookup Tables
    </Button>
  )
}
