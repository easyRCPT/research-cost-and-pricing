import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'

const LINK = 'rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
const ACTIVE = 'bg-card text-primary shadow-sm ring-1 ring-border'

/** The two questions an approver asks: what is waiting on me, and what has passed through me (#98). */
export function ApprovalsNav({ current }: { current: 'queue' | 'register' }) {
  return (
    <nav aria-label="Approvals" className="flex gap-1 rounded-lg bg-muted/60 p-1">
      <Link to="/approvals" className={cn(LINK, current === 'queue' && ACTIVE)} aria-current={current === 'queue' ? 'page' : undefined}>
        Waiting on you
      </Link>
      <Link
        to="/approvals/register"
        className={cn(LINK, current === 'register' && ACTIVE)}
        aria-current={current === 'register' ? 'page' : undefined}
      >
        Register
      </Link>
    </nav>
  )
}
