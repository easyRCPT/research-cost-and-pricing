import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Matches the outline treatment LookupButton uses against the primary bar. */
export function BackToProjectsButton({
  onClick,
  label = 'Projects',
}: {
  onClick: () => void
  /** "Approvals" for someone reviewing a costing rather than writing it. */
  label?: string
}) {
  return (
    <Button
      variant="outline"
      size="lg"
      className="border-primary-foreground/55 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
      onClick={onClick}
    >
      <ArrowLeftIcon />
      {label}
    </Button>
  )
}
