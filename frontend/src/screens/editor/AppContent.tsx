import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { type ComponentType, createElement } from 'react'

import { useBudget, useEditable, useMissingDetails } from '@/api/budget'
import { useLookups } from '@/api/lookups'
import { LOOKUP_SCREEN } from '@/components/lookups-tabs/lookupScreen'
import { AppShell } from '@/components/shell/AppShell'
import { DetailsNeededNotice } from '@/components/shell/DetailsNeededNotice'
import { ExportPdfButton } from '@/components/shell/ExportPdfButton'
import { MobileNav, NavPill } from '@/components/shell/MobileNav'
import { PageHead } from '@/components/shell/PageHead'
import { ReadOnlyNotice } from '@/components/shell/ReadOnlyNotice'
import { ScreenNav } from '@/components/shell/ScreenNav'
import { SECTIONS } from '@/components/shell/sections'
import {
  type EditorScreen,
  RailItem,
  SideBar as Sidebar,
} from '@/components/shell/Sidebar'
import { useBackTarget } from '@/components/shell/useBackTarget'
import { CurrencyContext } from '@/lib/format/currency'

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

/** The rail while Project Details is incomplete: every other screen greyed out. */
const DETAILS_ONLY = SECTIONS.map((section) => ({
  ...section,
  items: section.items.map((item) => ({
    ...item,
    disabled: item.id !== 'details',
  })),
}))

export function AppContent({
  screen: requested,
  setScreen,
  onLeave,
}: AppContentProps) {
  const { data: lookups } = useLookups()
  const currency = useBudget().data.budget_info.currency
  const editable = useEditable()
  const locked = useMissingDetails().length > 0
  const sections = locked ? DETAILS_ONLY : SECTIONS
  const screen = locked && requested !== LOOKUP_SCREEN ? 'details' : requested
  const navigate = useNavigate()
  const back = useBackTarget()

  const lookupsOpen = screen === LOOKUP_SCREEN
  const pageHeading = lookupsOpen
    ? { title: 'Lookup Tables', subtitle: 'Read-only' }
    : SCREEN_HEADINGS[screen]
  const backLabel = `Back to ${back?.label ?? 'Projects'}`
  const goBack = back ? () => navigate({ to: back.to }) : onLeave
  const openLookups = () => setScreen(LOOKUP_SCREEN)
  return (
    // Every amount on the costing's screens reads in its currency (#152).
    <CurrencyContext value={currency}>
      <AppShell
        sidebar={
          <Sidebar
            sections={sections}
            current={lookupsOpen ? null : screen}
            onSelect={setScreen}
            head={
              <>
                <RailItem
                  icon={
                    <ArrowLeftIcon className="-mx-[4.5px] size-4 shrink-0" />
                  }
                  onClick={goBack}
                >
                  {backLabel}
                </RailItem>
                <RailItem active={lookupsOpen} onClick={openLookups}>
                  Lookup Tables
                </RailItem>
              </>
            }
          />
        }
        mobileNav={
          <MobileNav
            sections={sections}
            current={lookupsOpen ? null : screen}
            onSelect={setScreen}
            head={
              <>
                <NavPill onClick={goBack}>
                  <ArrowLeftIcon />
                  {backLabel}
                </NavPill>
                <NavPill active={lookupsOpen} onClick={openLookups}>
                  Lookup Tables
                </NavPill>
              </>
            }
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
            <DetailsNeededNotice />
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
            <ScreenNav screen={screen} onSelect={setScreen} locked={locked} />
          </>
        )}
      </AppShell>
    </CurrencyContext>
  )
}
