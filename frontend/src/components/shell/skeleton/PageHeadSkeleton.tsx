interface PageHeadSkeletonProps {
  action?: boolean
}

// The bars sit inside line boxes built from PageHead's own type classes, so
// this matches the real header's height exactly and nothing shifts on load.
export function PageHeadSkeleton({ action }: PageHeadSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className="mb-6 flex animate-pulse items-center gap-4 print:hidden"
    >
      <div>
        <div className="text-[22px] leading-tight">
          <span className="inline-block h-[0.7em] w-48 rounded bg-muted-foreground/15 align-middle" />
        </div>
        <div className="mt-1 text-[13px]">
          <span className="inline-block h-[0.7em] w-72 max-w-full rounded bg-muted-foreground/15 align-middle" />
        </div>
      </div>
      {action && (
        <div className="ml-auto h-9 w-24 shrink-0 rounded-md bg-muted-foreground/15" />
      )}
    </div>
  )
}
