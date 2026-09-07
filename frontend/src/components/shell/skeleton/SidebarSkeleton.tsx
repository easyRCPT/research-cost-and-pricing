export function SidebarSkeleton() {
  return (
    <nav
      aria-hidden="true"
      className="sticky top-15 h-[calc(100vh-3.75rem)] border-r bg-card px-3 py-5"
    >
      <div className="animate-pulse space-y-6">
        {[1, 3, 2, 1].map((rows, group) => (
          <div key={group}>
            {group > 0 && (
              <div className="mb-3 ml-3 h-3 w-20 rounded bg-muted" />
            )}
            <div className="space-y-2">
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="h-9 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
