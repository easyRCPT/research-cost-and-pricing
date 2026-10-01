import { Alert, AlertDescription } from '@/components/ui/alert'

import { describeTrigger } from './triggers'

interface DeanTriggersProps {
  /** The sentence the reasons complete. */
  lead: string
  triggers: string[]
  className?: string
}

/** Why a dean has to authorise, as a lead-in and one line per rule that fired. */
export function DeanTriggers({ lead, triggers, className }: DeanTriggersProps) {
  return (
    <Alert className={className}>
      <AlertDescription>
        <b>{lead}</b>
        <ul className="mt-1 list-disc pl-5">
          {triggers.map((code) => (
            <li key={code}>{describeTrigger(code)}.</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
