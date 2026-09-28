import { Suspense } from 'react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { AppErrorState, AppShell, Sidebar, type SidebarSection } from '@/components/shell'
import { LookupSkeleton } from '@/components/lookups-tabs/LookupSkeleton'

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
 * two read as one product. Faculties and departments are not screens here:
 * they almost never change, and are edited in Django admin when they do.
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
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} fallbackRender={(props) => <AppErrorState {...props} />}>
            <Suspense fallback={<LookupSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </AppShell>
  )
}
