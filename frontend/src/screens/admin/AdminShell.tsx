import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'

import { LookupSkeleton } from '@/components/lookups-tabs/LookupSkeleton'
import { AppBoundary, AppShell, Sidebar, type SidebarSection } from '@/components/shell'

type AdminScreen = 'overview' | 'lookups' | 'users' | 'projects' | 'audit'

const SECTIONS: SidebarSection<AdminScreen>[] = [
  { label: 'Console', items: [{ id: 'overview', label: 'Overview' }] },
  { label: 'Reference data', items: [{ id: 'lookups', label: 'Lookup tables' }] },
  { label: 'People', items: [{ id: 'users', label: 'Users and approvers' }] },
  {
    label: 'Records',
    items: [
      { id: 'projects', label: 'Project register' },
      { id: 'audit', label: 'Audit log' },
    ],
  },
]

/**
 * The admin console's frame (#62): the calculator's own shell and rail, so the
 * two read as one product. Faculties, departments and the other reference
 * lists are tabs of the lookup tables screen (#70, #144), beside the rates.
 */
export function AdminShell() {
  const navigate = useNavigate()
  const current = useLocation({
    // /admin itself is the overview.
    select: (location) => (location.pathname.split('/')[2] || 'overview') as AdminScreen,
  })

  return (
    <AppShell
      sidebar={
        <Sidebar<AdminScreen>
          label="Admin sections"
          sections={SECTIONS}
          current={current}
          onSelect={(screen) => navigate({ to: screen === 'overview' ? '/admin' : `/admin/${screen}` })}
        />
      }
    >
      <AppBoundary fallback={<LookupSkeleton />}>
        <Outlet />
      </AppBoundary>
    </AppShell>
  )
}
