import { useState } from 'react'
import { toast } from 'sonner'

import { useReferenceWrite } from '@/api/admin-lookups'
import { AddRowForm } from '@/screens/admin/AddRowForm'
import {
  type Faculty,
  facultyOptions,
  type Refusal,
  refusalOf,
} from '@/screens/admin/reference/shared'
import type { ReferenceTableSpec } from '@/screens/admin/referenceTables'

export function AddReferenceRow({
  spec,
  faculties,
}: {
  spec: ReferenceTableSpec
  faculties: Faculty[]
}) {
  const write = useReferenceWrite()
  const [refusal, setRefusal] = useState<Refusal | null>(null)

  return (
    <AddRowForm
      title={`Add ${spec.noun === 'activity' ? 'an' : 'a'} ${spec.noun}`}
      fields={[spec.key, ...spec.fields]}
      options={facultyOptions(faculties)}
      ready={(entered) => String(entered[spec.key.field]).trim() !== ''}
      pending={write.isPending}
      refusal={refusal}
      onAdd={(entered, clear) =>
        write.mutate(
          {
            op: 'create',
            table: spec.id,
            values: Object.fromEntries(
              Object.entries(entered).map(([field, value]) => [
                field,
                String(value).trim(),
              ]),
            ),
          },
          {
            onSuccess: () => {
              toast.success(
                `${spec.noun[0].toUpperCase()}${spec.noun.slice(1)} added`,
                { description: String(entered[spec.key.field]) },
              )
              clear()
              setRefusal(null)
            },
            onError: (error) => setRefusal(refusalOf(error)),
          },
        )
      }
    />
  )
}
