import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import type { EditorScreen, SidebarSection } from './Sidebar'

interface MobileNavProps {
  sections: readonly SidebarSection[]
  current: EditorScreen | null
  onSelect: (screen: EditorScreen) => void
  /** The sidebar's head, as pills before a divider. */
  head?: ReactNode
}

/** The sidebar collapsed into a row of pills, for screens too narrow for it.
 *  Below md the sidebar is hidden entirely, so this is the only navigation. */
export function MobileNav({
  sections,
  current,
  onSelect,
  head,
}: MobileNavProps) {
  return (
    <nav
      aria-label="Costing sections"
      className="md:hidden print:hidden sticky top-[4.75rem] z-40 flex gap-1 overflow-x-auto border-b bg-card px-3 py-2"
    >
      {head && (
        <>
          {head}
          <span aria-hidden="true" className="mx-1 w-px shrink-0 bg-border" />
        </>
      )}
      {sections
        .flatMap((section) => section.items)
        .map((item) => (
          <NavPill
            key={item.id}
            active={item.id === current}
            disabled={item.disabled}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </NavPill>
        ))}
    </nav>
  )
}

interface NavPillProps {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

export function NavPill({
  active = false,
  disabled = false,
  onClick,
  children,
}: NavPillProps) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium disabled:opacity-40 [&_svg]:size-3.5',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  )
}
