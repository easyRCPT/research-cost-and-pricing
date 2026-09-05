import { useState } from 'react'
import {
  PageHead,
  Panel,
  Sidebar,
  TopBar,
  SECTIONS,
  type EditorScreen,
} from '@/components/shell'

const SCREEN_COPY: Record<EditorScreen, { title: string; subtitle: string }> = {
  details: {
    title: 'Project Details',
    subtitle: 'Part A — project identity, duration and account attributes',
  },
  staff: {
    title: 'Staff Costs',
    subtitle: 'Part B — direct salary and on-costs paid by the project',
  },
  nonstaff: {
    title: 'Non-Staff Costs',
    subtitle: 'Part C — equipment, services, travel and student support',
  },
  cash: {
    title: 'Cash Co-Contributions',
    subtitle: 'Part D — University cash committed to the project',
  },
  adjust: {
    title: 'Adjust Price',
    subtitle: 'Identify in-kind contributions and review the proposed price',
  },
  price: {
    title: 'Price Summary',
    subtitle: 'Review the complete costing and pricing position',
  },
  budget: {
    title: 'Budget Form',
    subtitle: 'The costing record prepared for authorisation',
  },
}

function App() {
  const [screen, setScreen] = useState<EditorScreen>('details')
  const copy = SCREEN_COPY[screen]

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="grid md:grid-cols-[236px_minmax(0,1fr)]">
        <Sidebar sections={SECTIONS} current={screen} onSelect={setScreen} />

        <main className="w-full max-w-7xl px-8 py-7 pb-24">
          <PageHead title={copy.title} subtitle={copy.subtitle} />
          <Panel>
            <div className="grid min-h-64 place-items-center rounded-md border border-dashed bg-muted/35 px-6 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                {copy.title} content will be built as its own vertical slice.
              </p>
            </div>
          </Panel>
        </main>
      </div>
    </div>
  )
}

export default App
