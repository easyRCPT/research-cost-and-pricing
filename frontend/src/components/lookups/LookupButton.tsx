import type { EditorScreen } from '@/components/shell'
import { Button } from '@/components/ui/button'

export const LOOKUPS = 'lookups'

interface LookupButtonProps {
  open: boolean
  handleClick: (screen: EditorScreen | typeof LOOKUPS) => void
}

export function LookupButton({ open, handleClick }: LookupButtonProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      aria-pressed={open}
      className={
        open
          ? 'border-primary-foreground bg-primary-foreground text-primary hover:bg-primary-foreground hover:text-primary'
          : 'border-primary-foreground/55 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
      }
      onClick={() => handleClick(open ? 'details' : LOOKUPS)}
    >
      Lookup Tables
    </Button>
  )
}
