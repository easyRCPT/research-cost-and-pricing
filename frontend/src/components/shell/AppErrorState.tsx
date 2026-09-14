import { type FallbackProps } from 'react-error-boundary'
import { AppShell } from './AppShell'
import { SidebarSkeleton } from './skeleton/SidebarSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function AppErrorState({ error, resetErrorBoundary }: FallbackProps) {
  const message =
    error instanceof Error ? error.message : 'An unknown error occured'

  return (
    <AppShell sidebar={<SidebarSkeleton />}>
      <Alert variant="destructive" className="max-w-2xl">
        <AlertTitle>Could not load the application</AlertTitle>
        <AlertDescription>
          <p>{message}</p>
          <Button
            type="button"
            variant="destructive"
            className="mt-3"
            onClick={resetErrorBoundary}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </AppShell>
  )
}
