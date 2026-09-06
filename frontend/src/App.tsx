import { useState } from 'react'
import type { ProjectInfo } from './types'
import {
  PageHead,
  Sidebar,
  TopBar,
  SECTIONS,
  type EditorScreen,
} from '@/components/shell'
import { LOOKUPS, LookupButton } from '@/components/lookups/LookupButton'
import { SCREEN_HEADINGS, Lookups } from '@/screens/'
import { EMPTY_PROJECT } from './lib/constants'
import { EditorScreenContent } from './screens/EditorScreenContent'

function App() {
  const [screen, setScreen] = useState<EditorScreen | typeof LOOKUPS>('details')
  const [project, setProject] = useState<ProjectInfo>(EMPTY_PROJECT)

  const patchProject = (patch: Partial<ProjectInfo>) =>
    setProject((current) => ({ ...current, ...patch }))

  const lookupsOpen = screen === LOOKUPS
  const lookupHeading = {
    title: 'Lookup Tables',
    subtitle: 'Read-only',
  }
  const currPageHeading = lookupsOpen ? lookupHeading : SCREEN_HEADINGS[screen]

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        right={<LookupButton open={lookupsOpen} handleClick={setScreen} />}
      />
      <div className="grid md:grid-cols-[236px_minmax(0,1fr)]">
        <Sidebar
          sections={SECTIONS}
          current={lookupsOpen ? null : screen}
          onSelect={setScreen}
        />
        <main className="w-full max-w-7xl px-8 py-7 pb-24">
          <PageHead
            title={currPageHeading.title}
            subtitle={currPageHeading.subtitle}
          />
          {/* --- Main Content Section --- */}
          {screen === LOOKUPS ? (
            <Lookups />
          ) : (
            <EditorScreenContent
              screen={screen}
              project={project}
              onChange={patchProject}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
