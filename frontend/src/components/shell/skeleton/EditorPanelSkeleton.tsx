import { Panel } from '../Panel'

// TODO: Create dedicated skeletons for individual screens
export function EditorPanelSkeleton() {
  return (
    <Panel>
      <div className="divide-y">
        {Array.from({ length: 8 }, (_, row) => (
          <div
            key={row}
            className="grid gap-2 py-4 first:pt-0 last:pb-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6"
          >
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-9 max-w-lg rounded bg-muted" />
          </div>
        ))}
      </div>
    </Panel>
  )
}
