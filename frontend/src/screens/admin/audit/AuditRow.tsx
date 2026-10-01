import type { AuditEntry } from '@/api/admin-console'
import { Td } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { dateTime } from '@/lib/format/dates'
import { actor } from '@/screens/admin/audit/columns'

export function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <tr>
      <Td className="tabular whitespace-nowrap text-muted-foreground">
        {dateTime(entry.created_at)}
      </Td>
      <Td>{actor(entry)}</Td>
      <Td>
        <Badge variant="secondary" className="font-mono text-[11.5px]">
          {entry.action}
        </Badge>
      </Td>
      <Td className="text-muted-foreground">
        {entry.object_type} #{entry.object_id}
      </Td>
    </tr>
  )
}
