import { useNavigate } from '@tanstack/react-router'

import {
  useBudget,
  useEditable,
  useNonStaffLines,
  useUpdateProject,
} from '@/api/budget'
import { useLookups } from '@/api/lookups'
import {
  LOOKUP_SCREEN,
  LookupButton,
} from '@/components/lookups-tabs/LookupButton'
import { LookupsScreen, SCREEN_HEADINGS } from '@/screens'
import { EditorScreenContent } from '@/screens/EditorScreenContent'

import { AppShell } from './AppShell'
import { BackToProjectsButton } from './BackToProjectsButton'
import { ExportPdfButton } from './ExportPdfButton'
import { MobileNav } from './MobileNav'
import { PageHead } from './PageHead'
import { ReadOnlyNotice } from './ReadOnlyNotice'
import { ScreenNav } from './ScreenNav'
import { SECTIONS } from './sections'
import { type EditorScreen,SideBar as Sidebar } from './Sidebar'
import { useBackTarget } from './useBackTarget'

interface AppContentProps {
  screen: AppScreen
  setScreen: (screen: AppScreen) => void
  /** Back out of the costing flow, to the projects list. */
  onLeave: () => void
}

export type AppScreen = EditorScreen | typeof LOOKUP_SCREEN

export function AppContent({ screen, setScreen, onLeave }: AppContentProps) {
  const { data: lookups } = useLookups()
  const { data: budget } = useBudget()
  const editable = useEditable()
  const navigate = useNavigate()
  const back = useBackTarget()
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
      topBarRight={
        <>
          {back ? (
            <BackToProjectsButton
              label={back.label}
              onClick={() => navigate({ to: back.to })}
            />
          ) : (
            <BackToProjectsButton onClick={onLeave} />
          )}
          <LookupButton open={lookupsOpen} handleClick={setScreen} />
        </>
      }
      sidebar={
        <Sidebar
          sections={SECTIONS}
          current={lookupsOpen ? null : screen}
          onSelect={setScreen}
        />
      }
      mobileNav={
        <MobileNav
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
          <ReadOnlyNotice />
          {/*
            One switch for every control on every screen: a disabled fieldset
            disables each input, select, button and checkbox inside it. The
            Approvals screen stays outside, because its Export PDF has to keep
            working on a submitted costing and it handles its own fields.
          */}
          <fieldset
            disabled={!editable && screen !== 'approvals'}
            className="min-w-0"
          >
            <EditorScreenContent
              lookups={lookups}
              screen={screen}
              project={project}
              onChange={updateProject}
              nonStaff={nonStaff}
            />
          </fieldset>
          <ScreenNav screen={screen} onSelect={setScreen} />
        </>
      )}
    </AppShell>
  )
}
