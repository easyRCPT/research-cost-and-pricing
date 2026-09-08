import { cn } from '@/lib/utils'

export type EditorScreen =
  | 'details'
  | 'staff'
  | 'nonstaff'
  | 'cash'
  | 'adjust'
  | 'price'
  | 'budget'

export interface SidebarSection {
  label?: string
  items: readonly { id: EditorScreen; label: string }[]
}

interface SideBarProps {
  sections: readonly SidebarSection[]
  current: EditorScreen | null
  onSelect: (screen: EditorScreen) => void
}

export function SideBar({ sections, current, onSelect }: SideBarProps) {
  return (
    <nav
      aria-label="Costing sections"
      className="sticky top-15 h-[calc(100vh-3.75rem)] overflow-y-auto border-r bg-card px-3 py-5"
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.label ?? 'project'}
          className={sectionIndex > 0 ? 'mt-6' : undefined}
        >
          {section.label && (
            <h2 className="px-3 pb-2 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {section.label}
            </h2>
          )}

          <ol className="space-y-1">
            {section.items.map((item) => {
              const active = item.id === current

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3.5 rounded-lg px-3 py-2 text-left text-[15px] font-medium',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-[7px] shrink-0 rounded-full',
                        active ? 'bg-primary-foreground' : 'bg-border',
                      )}
                    />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </nav>
  )
}
