import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Tracks which edges of a scroll container still have content past them. */
function useScrollOverflow<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [overflow, setOverflow] = React.useState({ top: false, bottom: false })

  const sync = React.useCallback(() => {
    const viewport = ref.current
    if (!viewport) return
    const top = viewport.scrollTop > 1
    const bottom =
      viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1
    setOverflow((current) =>
      current.top === top && current.bottom === bottom
        ? current
        : { top, bottom }
    )
  }, [])

  // The list may open already scrolled to a selected item, so measure on mount.
  React.useEffect(() => {
    const viewport = ref.current
    if (!viewport) return
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(viewport)
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild)
    return () => observer.disconnect()
  }, [sync])

  return { ref, overflow, sync }
}

/** Fades a chevron over the top or bottom edge while the list scrolls further that way. */
function ScrollIndicator({
  side,
  visible,
  className,
}: {
  side: "top" | "bottom"
  visible: boolean
  className?: string
}) {
  const Icon = side === "top" ? ChevronUpIcon : ChevronDownIcon
  return (
    <div
      aria-hidden
      data-slot={`scroll-${side}-indicator`}
      data-visible={visible}
      // Overlaid rather than in flow, so the rows don't shift when it appears,
      // and stopping short of the right edge keeps it off the scrollbar.
      className={cn(
        "pointer-events-none absolute right-3 left-0 z-10 flex h-7 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 data-[visible=true]:opacity-100",
        side === "top"
          ? "top-0 rounded-t-lg bg-linear-to-b from-popover from-65% to-transparent"
          : "bottom-0 rounded-b-lg bg-linear-to-t from-popover from-65% to-transparent",
        className
      )}
    >
      <Icon className="size-4" />
    </div>
  )
}

/**
 * A scroll box with a chevron over whichever edge has more content past it, and
 * a scrollbar that stays put. Mount it with the content it scrolls — it
 * measures on mount.
 */
function ScrollViewport({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { ref, overflow, sync } = useScrollOverflow<HTMLDivElement>()
  return (
    <div className="relative min-h-0">
      <div
        ref={ref}
        onScroll={sync}
        // The gutter is reserved whether or not the list overflows, so the
        // scrollbar never shifts the rows as it appears.
        className={cn(
          "scroll-persist overflow-y-auto [scrollbar-gutter:stable]",
          className
        )}
        {...props}
      >
        {children}
      </div>
      <ScrollIndicator side="top" visible={overflow.top} />
      <ScrollIndicator side="bottom" visible={overflow.bottom} />
    </div>
  )
}

export { ScrollIndicator, ScrollViewport, useScrollOverflow }
