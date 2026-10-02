import type { LookupVersion } from '@/api/admin-lookups'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dateTime } from '@/lib/format/dates'

import type { Shown, VersionTab } from './types'
import { VersionBudgets } from './VersionBudgets'
import { VersionChanges } from './VersionChanges'

interface VersionDialogProps {
  version: LookupVersion
  tab: Shown['tab']
  onTab: (tab: VersionTab) => void
  onClose: () => void
}

/** The changes saved into one version, and the costings priced on it. */
export function VersionDialog({
  version,
  tab,
  onTab,
  onClose,
}: VersionDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Version #{version.id}</DialogTitle>
          <DialogDescription>
            Made {dateTime(version.created_at)}
            {version.updated_by_name && ` by ${version.updated_by_name}`}.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(next) => onTab(next as VersionTab)}
          className="gap-2"
        >
          <TabsList variant="line">
            <TabsTrigger value="changes">Changes saved</TabsTrigger>
            <TabsTrigger value="costings">Costings priced on it</TabsTrigger>
          </TabsList>
          <TabsContent value="changes" className="max-h-[60vh] overflow-auto">
            <VersionChanges versionId={version.id} />
          </TabsContent>
          <TabsContent value="costings" className="max-h-[60vh] overflow-auto">
            {version.budgets_priced === 0 ? (
              <p className="text-muted-foreground">
                No costing has been priced on this version.
              </p>
            ) : (
              <VersionBudgets versionId={version.id} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
