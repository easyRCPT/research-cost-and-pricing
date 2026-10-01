import { ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface DisclosureProps {
  /** What the closed row says. */
  title: ReactNode
  children: ReactNode
}

/** A row that opens to what it summarises, closed until asked. */
export function Disclosure({ title, children }: DisclosureProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group/disclosure flex w-full cursor-pointer items-center gap-2 py-1.5 text-left">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/disclosure:rotate-90" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6">{children}</CollapsibleContent>
    </Collapsible>
  )
}
