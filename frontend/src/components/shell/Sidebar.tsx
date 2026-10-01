import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type EditorScreen =
  | 'details'
  | 'staff'
  | 'nonstaff'
  | 'cash'
  | 'adjust'
  | 'price'
  | 'budget'
  | 'approvals'

/**
 * One rail for the calculator and the admin console, so the two read as one
 * product. Generic over the item id: the calculator's ids are its screens, the
 * console's are route segments. Defaults to the calculator's, so existing call
 * sites type-check as before.
 */
export interface SidebarSection<Id extends string = EditorScreen> {
  label?: string
  items: readonly { id: Id; label: string; disabled?: boolean }[]
}

interface SideBarProps<Id extends string> {
  sections: readonly SidebarSection<Id>[]
  current: Id | null
  onSelect: (id: Id) => void
  /** What a screen reader announces the rail as. */
  label?: string
  /** Above the sections and a divider: links out of them, such as back to the projects. */
  head?: ReactNode
  /** Below the sections: a link out, rather than a screen of this rail. */
  footer?: React.ReactNode
}

export function SideBar<Id extends string = EditorScreen>({
  sections,
  current,
  onSelect,
  label = 'Costing sections',
  head,
  footer,
}: SideBarProps<Id>) {
  return (
    <nav
      aria-label={label}
      className="hidden md:block sticky top-15 h-[calc(100vh-3.75rem)] overflow-y-auto border-r bg-card px-3 py-5 print:hidden"
    >
      {head && <div className="mb-5 space-y-1 border-b pb-5">{head}</div>}
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
                  <RailItem
                    active={active}
                    disabled={item.disabled}
                    onClick={() => onSelect(item.id)}
                  >
                    {item.label}
                  </RailItem>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
      {footer && <div className="mt-6 border-t px-3 pt-4">{footer}</div>}
    </nav>
  )
}

interface RailItemProps {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  /** In place of the dot. */
  icon?: ReactNode
  children: ReactNode
}

/** One button of the rail, for the sections and for the head above them. */
export function RailItem({
  active = false,
  disabled = false,
  onClick,
  icon,
  children,
}: RailItemProps) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-lg px-3 py-2 text-left text-[15px] font-medium disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-muted',
      )}
    >
      {icon ?? (
        <span
          aria-hidden="true"
          className={cn(
            'size-[7px] shrink-0 rounded-full',
            active ? 'bg-primary-foreground' : 'bg-border',
          )}
        />
      )}
      {children}
    </button>
  )
}
