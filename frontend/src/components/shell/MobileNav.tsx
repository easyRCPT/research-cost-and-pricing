import { cn } from '@/lib/utils'
import type { EditorScreen, SidebarSection } from './Sidebar'

interface MobileNavProps {
  sections: readonly SidebarSection[]
  current: EditorScreen | null
  onSelect: (screen: EditorScreen) => void
}

/** The sidebar collapsed into a row of pills, for screens too narrow for it.
 *  Below md the sidebar is hidden entirely, so this is the only navigation. */
export function MobileNav({ sections, current, onSelect }: MobileNavProps) {
  return (
    <nav
      aria-label="Costing sections"
      className="md:hidden print:hidden sticky top-[4.75rem] z-40 flex gap-1 overflow-x-auto border-b bg-card px-3 py-2"
    >
      {sections.flatMap((section) => section.items).map((item) => {
        const active = item.id === current

        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}