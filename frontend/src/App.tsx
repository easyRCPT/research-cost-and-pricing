import { useState } from 'react'
import type { ProjectInfo } from './types'
import {
  PageHead,
  Panel,
  Sidebar,
  TopBar,
  SECTIONS,
  type EditorScreen,
} from '@/components/shell'
import { SCREEN_HEADINGS, ProjectDetails } from '@/screens/'
import { EMPTY_PROJECT } from './lib/constants'

function App() {
  const [screen, setScreen] = useState<EditorScreen>('details')
  const [project, setProject] = useState<ProjectInfo>(EMPTY_PROJECT)
  const copy = SCREEN_HEADINGS[screen]

  const patchProject = (patch: Partial<ProjectInfo>) =>
    setProject((current) => ({ ...current, ...patch }))

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="grid md:grid-cols-[236px_minmax(0,1fr)]">
        <Sidebar sections={SECTIONS} current={screen} onSelect={setScreen} />

        <main className="w-full max-w-7xl px-8 py-7 pb-24">
          <PageHead title={copy.title} subtitle={copy.subtitle} />
          {screen === 'details' ? (
            <ProjectDetails project={project} onChange={patchProject} />
          ) : (
            <Panel>
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed bg-muted/35 px-6 text-center">
                <p className="max-w-md text-sm text-muted-foreground">
                  {copy.title} content will be built as its own vertical slice.
                </p>
              </div>
            </Panel>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
