import { useLookups } from '@/api/lookups'
import { LookupSkeleton } from '@/components/lookups/LookupSkeleton'
import { LookupTabs } from '@/components/lookups/LookupTabs'
import { PageHead } from '@/components/shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function Lookups() {
  const lookups = useLookups()

  return (
    <>
      <PageHead title="Lookup Tables" subtitle="Read-only" />
      {lookups.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the lookup tables</AlertTitle>
          <AlertDescription>{lookups.error.message}</AlertDescription>
        </Alert>
      ) : lookups.isPending ? (
        <LookupSkeleton />
      ) : (
        <LookupTabs data={lookups.data} />
      )}
    </>
  )
}
