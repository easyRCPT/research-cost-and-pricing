import { Button } from '@/components/ui/button'
import { SECTIONS } from './sections'
import type { EditorScreen, SidebarSection } from './Sidebar'

const ORDER = (SECTIONS as readonly SidebarSection[]).flatMap(
  (section) => section.items,
)

interface ScreenNavProps {
  screen: EditorScreen
  onSelect: (screen: EditorScreen) => void
}

export function ScreenNav({ screen, onSelect }: ScreenNavProps) {
  const index = ORDER.findIndex((item) => item.id === screen)

  if (index < 0) return null

  const previous = index > 0 ? ORDER[index - 1] : undefined
  const next = index < ORDER.length - 1 ? ORDER[index + 1] : undefined

  return (
    <div className="mt-8 flex flex-wrap justify-end gap-3 print:hidden">
      {previous && (
        <Button
          variant="outline"
          size="lg"
          className="w-full px-5 md:w-auto bg-white hover:bg-white/70"
          onClick={() => onSelect(previous.id)}
        >
          Back
        </Button>
      )}
      {next && (
        <Button
          size="lg"
          className="w-full px-5 md:w-auto"
          onClick={() => onSelect(next.id)}
        >
          Continue to {next.label}
        </Button>
      )}
    </div>
  )
}
