import { useLookups } from '@/api/lookups'
import { LOOKUP_SCREEN, LookupButton } from '../lookups-tabs/LookupButton'
import type { EditorScreen } from './Sidebar'
import { useState } from 'react'
import { EMPTY_PROJECT, STARTING_ROWS } from '@/lib/constants'
import { emptyNonStaffLine } from '@/lib/non-staff'
import { type ProjectInfo, type NonStaffLine } from '@/types'
import { projectYears } from '@/lib/budget'
import { LookupsScreen, SCREEN_HEADINGS } from '@/screens'
import { AppShell } from './AppShell'
import { PageHead, SECTIONS, ScreenNav, Sidebar } from '.'
import { EditorScreenContent } from '@/screens/EditorScreenContent'

interface AppContentProps {
  screen: AppScreen
  setScreen: (screen: AppScreen) => void
}

export type AppScreen = EditorScreen | typeof LOOKUP_SCREEN

const DEMO_BUDGET_ID = 1

export function AppContent({ screen, setScreen }: AppContentProps) {
  const { data: lookups } = useLookups()
  const [project, setProject] = useState<ProjectInfo>(EMPTY_PROJECT)
  const [nonStaffLines, setNonStaffLines] = useState<NonStaffLine[]>(() =>
    Array.from({ length: STARTING_ROWS }, (_, index) =>
      emptyNonStaffLine(-(index + 1), projectYears(EMPTY_PROJECT)),
    ),
  )

  const lookupsOpen = screen === LOOKUP_SCREEN
  const pageHeading = lookupsOpen
    ? { title: 'Lookup Tables', subtitle: 'Read-only' }
    : SCREEN_HEADINGS[screen]
  const years = projectYears(project)

  const patchProject = (patch: Partial<ProjectInfo>) =>
    setProject((current) => ({ ...current, ...patch }))

  return (
    <AppShell
      topBarRight={<LookupButton open={lookupsOpen} handleClick={setScreen} />}
      sidebar={
        <Sidebar
          sections={SECTIONS}
          current={lookupsOpen ? null : screen}
          onSelect={setScreen}
        />
      }
    >
      <PageHead title={pageHeading.title} subtitle={pageHeading.subtitle} />
      {lookupsOpen ? (
        <LookupsScreen lookups={lookups} />
      ) : (
        <>
          <EditorScreenContent
            lookups={lookups}
            screen={screen}
            project={project}
            onChange={patchProject}
            nonStaff={{
              lines: nonStaffLines,
              years,
              setLines: setNonStaffLines,
            }}
            budgetId={DEMO_BUDGET_ID}
          />
          <ScreenNav screen={screen} onSelect={setScreen} />
        </>
      )}
    </AppShell>
  )
}
