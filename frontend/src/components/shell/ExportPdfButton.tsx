import { Button } from '@/components/ui/button'

export function ExportPdfButton() {
  return (
    <Button
      variant="outline"
      className="bg-white hover:bg-white/70"
      size="lg"
      onClick={() => window.print()}
    >
      Export PDF
    </Button>
  )
}
