import { useNavigate } from '@tanstack/react-router'
import { type ComponentType, createElement } from 'react'

import { useEditable } from '@/api/budget'
import { useLookups } from '@/api/lookups'
import {
  LOOKUP_SCREEN,
  LookupButton,
} from '@/components/lookups-tabs/LookupButton'
import { AppShell } from '@/components/shell/AppShell'
import { BackToProjectsButton } from '@/components/shell/BackToProjectsButton'
import { ExportPdfButton } from '@/components/shell/ExportPdfButton'
import { MobileNav } from '@/components/shell/MobileNav'
import { PageHead } from '@/components/shell/PageHead'
import { ReadOnlyNotice } from '@/components/shell/ReadOnlyNotice'
import { ScreenNav } from '@/components/shell/ScreenNav'
import { SECTIONS } from '@/components/shell/sections'
import {
  type EditorScreen,
  SideBar as Sidebar,
} from '@/components/shell/Sidebar'
import { useBackTarget } from '@/components/shell/useBackTarget'

import { AdjustPrice } from '../AdjustPrice'
import { Approvals } from '../Approvals'
import { BudgetForm } from '../BudgetForm'
import { CashCoContributions } from '../CashCoContributions'
import { LookupsScreen } from '../LookupsScreen'
import { NonStaffCosts } from '../NonStaffCosts'
import { PriceSummary } from '../PriceSummary'
import { ProjectDetails } from '../ProjectDetails'
import { SCREEN_HEADINGS } from '../screens'
import { StaffCosts } from '../StaffCosts'

interface AppContentProps {
  screen: AppScreen
  setScreen: (screen: AppScreen) => void
  /** Back out of the costing flow, to the projects list. */
  onLeave: () => void
}

export type AppScreen = EditorScreen | typeof LOOKUP_SCREEN

/** Each screen reads its own data, so a change to one re-renders only it. */
const EDITOR_SCREENS: Record<EditorScreen, ComponentType> = {
  details: ProjectDetails,
  staff: StaffCosts,
  nonstaff: NonStaffCosts,
  cash: CashCoContributions,
  adjust: AdjustPrice,
  price: PriceSummary,
  budget: BudgetForm,
  approvals: Approvals,
}

export function AppContent({ screen, setScreen, onLeave }: AppContentProps) {
  const { data: lookups } = useLookups()
  const editable = useEditable()
  const navigate = useNavigate()
  const back = useBackTarget()

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
            {createElement(EDITOR_SCREENS[screen])}
          </fieldset>
          <ScreenNav screen={screen} onSelect={setScreen} />
        </>
      )}
    </AppShell>
  )
}
