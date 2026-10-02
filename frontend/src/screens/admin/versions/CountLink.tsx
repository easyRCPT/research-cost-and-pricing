import { Button } from '@/components/ui/button'

interface CountLinkProps {
  count: number
  label: string
  onClick: () => void
}

/** A count that opens the list it counts; a zero has nothing to open. */
export function CountLink({ count, label, onClick }: CountLinkProps) {
  if (count === 0) return <span className="tabular">0</span>
  return (
    <Button
      size="sm"
      variant="link"
      className="tabular h-auto p-0"
      aria-label={label}
      onClick={onClick}
    >
      {count}
    </Button>
  )
}
