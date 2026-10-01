import { ArrowLeftIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** A back button for the primary bar. */
export function BackToProjectsButton({
  onClick,
  label = 'Projects',
}: {
  onClick: () => void
  /** "Approvals" for someone reviewing a costing rather than writing it. */
  label?: string
}) {
  return (
    <Button variant="bar" size="lg" onClick={onClick}>
      <ArrowLeftIcon />
      {label}
    </Button>
  )
}
