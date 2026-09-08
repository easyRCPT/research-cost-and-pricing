import { Button } from '@/components/ui/button'

export function ExportPdfButton() {
  return (
    <Button variant="outline" size="lg" onClick={() => window.print()}>
      Export PDF
    </Button>
  )
}
