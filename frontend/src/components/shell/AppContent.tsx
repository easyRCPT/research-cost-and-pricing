import { useLookups } from '@/api/lookups'
import { LOOKUP_SCREEN, LookupButton } from '../lookups-tabs/LookupButton'
import type { EditorScreen } from './Sidebar'
import { useBudget, useNonStaffLines, useUpdateProject } from '@/api/budget'
import { LookupsScreen, SCREEN_HEADINGS } from '@/screens'
import { AppShell } from './AppShell'
import { ExportPdfButton, PageHead, SECTIONS, ScreenNav, Sidebar } from '.'
import { EditorScreenContent } from '@/screens/EditorScreenContent'

interface AppContentProps {
  screen: AppScreen
  setScreen: (screen: AppScreen) => void
}

export type AppScreen = EditorScreen | typeof LOOKUP_SCREEN

export function AppContent({ screen, setScreen }: AppContentProps) {
  const { data: lookups } = useLookups()
  const { data: budget } = useBudget()
  const updateProject = useUpdateProject()

  const project = budget.project_info
  const years = budget.years
  const nonStaff = useNonStaffLines(years)

  const lookupsOpen = screen === LOOKUP_SCREEN
  const pageHeading = lookupsOpen
    ? { title: 'Lookup Tables', subtitle: 'Read-only' }
    : SCREEN_HEADINGS[screen]
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
      <PageHead
        title={pageHeading.title}
        subtitle={pageHeading.subtitle}
        right={screen === 'budget' ? <ExportPdfButton /> : undefined}
      />
      {lookupsOpen ? (
        <LookupsScreen lookups={lookups} />
      ) : (
        <>
          <EditorScreenContent
            lookups={lookups}
            screen={screen}
            project={project}
            onChange={updateProject}
            nonStaff={nonStaff}
          />
          <ScreenNav screen={screen} onSelect={setScreen} />
        </>
      )}
    </AppShell>
  )
}
