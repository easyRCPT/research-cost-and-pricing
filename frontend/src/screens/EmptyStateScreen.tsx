import { Panel } from '@/components/shell'

export function EmptyStateScreen() {
  return (
    <Panel>
      <div className="grid min-h-64 place-items-center rounded-md border border-dashed bg-muted/35 px-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Content will be available soon.
        </p>
      </div>
    </Panel>
  )
}
