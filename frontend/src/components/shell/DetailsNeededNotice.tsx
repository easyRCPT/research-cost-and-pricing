import { useEditable, useMissingDetails } from '@/api/budget'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function DetailsNeededNotice() {
  const missing = useMissingDetails()
  const editable = useEditable()
  if (missing.length === 0 || !editable) return null

  return (
    <Alert className="mb-4">
      <AlertDescription>
        Add the {listed(missing)} to open costing and pricing.
      </AlertDescription>
    </Alert>
  )
}

const listed = (items: string[]) =>
  items.length === 1
    ? items[0]
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
