import { Panel, type EditorScreen } from '@/components/shell'
import type { ProjectInfo } from '@/types'
import { ProjectDetails } from './ProjectDetails'

interface EditorScreenContentProps {
  screen: EditorScreen
  project: ProjectInfo
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function EditorScreenContent({
  screen,
  project,
  onChange,
}: EditorScreenContentProps) {
  return (
    <>
      {screen === 'details' ? (
        <ProjectDetails project={project} onChange={onChange} />
      ) : (
        <Panel>
          <div className="grid min-h-64 place-items-center rounded-md border border-dashed bg-muted/35 px-6 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Content will be available soon.
            </p>
          </div>
        </Panel>
      )}
    </>
  )
}
