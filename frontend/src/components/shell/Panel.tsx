import type { ReactNode } from 'react'
import { ChevronRightIcon, InfoIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const TITLE = 'flex items-center gap-2 text-[15.5px] font-semibold text-primary'
const BLURB = 'max-w-[80ch] text-[13px] text-muted-foreground'

interface PanelProps {
  title?: ReactNode
  description?: string
  /** Shown in a tooltip beside the title, where a description would be too heavy. */
  hint?: string
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

export function Panel({
  title,
  description,
  hint,
  collapsible,
  defaultOpen = false,
  className,
  children,
}: PanelProps) {
  const shell = cn(
    'rounded-lg border bg-card px-6 py-6 text-card-foreground',
    className,
  )

  if (collapsible) {
    return (
      <Collapsible asChild defaultOpen={defaultOpen}>
        <section className={cn(shell, 'group/panel')}>
          <h3 className={TITLE}>
            <CollapsibleTrigger className="flex cursor-pointer items-center gap-2 text-left">
              <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]/panel:rotate-90" />
              {title}
            </CollapsibleTrigger>
            {hint && <Hint text={hint} />}
          </h3>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="mt-4">
              {description && (
                <p className={cn(BLURB, 'mb-4')}>{description}</p>
              )}
              {children}
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    )
  }

  return (
    <section className={shell}>
      {title && (
        <h3 className={cn(TITLE, !description && 'mb-4')}>
          {title}
          {hint && <Hint text={hint} />}
        </h3>
      )}
      {description && <p className={cn(BLURB, 'mt-0.5 mb-4')}>{description}</p>}
      {children}
    </section>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label={text}
          className="cursor-help text-muted-foreground"
        >
          <InfoIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
