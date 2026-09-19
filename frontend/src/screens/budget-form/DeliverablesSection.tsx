import { Plus, X } from 'lucide-react'

import {
  CellChoice,
  CellNumber,
  CellTd,
  CellText,
  Grid,
  PartBar,
  Td,
  Th,
} from '@/components/shell'
import { Button } from '@/components/ui/button'
import { useDeliverables } from '@/api/budget'
import { isDraft } from '@/api/budget/drafts'
import { useLookups } from '@/api/lookups'
import { typeNames } from '@/lib/deliverables'
import { MAX_MONEY, toastOutOfRange } from '@/lib/range'

export function DeliverablesSection() {
  const { rows, patchRow, addRow, removeRow } = useDeliverables()
  const { data: lookups } = useLookups()
  const types = typeNames(lookups)

  return (
    <>
      <PartBar description="Must be completed for Grants. Record all technical and financial deliverables and invoicing dates.">
        PART J — Deliverables{' '}
        <span className="font-normal text-muted-foreground">
          optional for contracts
        </span>
      </PartBar>
      <Grid>
        <thead>
          <tr>
            <Th className="w-11" align="center">
              No.
            </Th>
            <Th>Description</Th>
            <Th>Type</Th>
            <Th align="right">Invoice Amount</Th>
            <Th>Due Date</Th>
            <Th>Dependency Sponsor</Th>
            <Th className="w-10 print:hidden" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={isDraft(row.id) ? 'print:hidden' : undefined}>
              <Td align="center" className="text-muted-foreground">
                {row.number}
              </Td>
              <CellTd>
                <CellText
                  className="min-w-56 print:min-w-0"
                  value={row.description}
                  onChange={(description) => patchRow(row.id, { description })}
                />
              </CellTd>
              <CellTd>
                <CellChoice
                  value={row.deliverable_type}
                  options={types}
                  placeholder="Select…"
                  onChange={(deliverable_type) =>
                    patchRow(row.id, { deliverable_type })
                  }
                />
              </CellTd>
              <CellTd>
                <CellNumber
                  className="w-28 print:w-auto"
                  prefix="$"
                  min={0}
                  max={MAX_MONEY}
                  onOutOfRange={() =>
                    toastOutOfRange('Invoice amount', 0, MAX_MONEY)
                  }
                  value={row.invoice_amount ?? 0}
                  onChange={(invoice_amount) =>
                    patchRow(row.id, { invoice_amount })
                  }
                />
              </CellTd>
              <CellTd>
                <CellText
                  className="min-w-28 print:min-w-0"
                  placeholder="dd/mm/yyyy"
                  value={row.due_date}
                  onChange={(due_date) => patchRow(row.id, { due_date })}
                />
              </CellTd>
              <CellTd>
                <CellText
                  className="min-w-40 print:min-w-0"
                  value={row.sponsor}
                  onChange={(sponsor) => patchRow(row.id, { sponsor })}
                />
              </CellTd>
              <Td align="center" className="print:hidden">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${row.description || 'deliverable'}`}
                  className="text-muted-foreground hover:bg-bad-bg hover:text-bad"
                  onClick={() => removeRow(row.id)}
                >
                  <X />
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Grid>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 print:hidden"
        onClick={addRow}
      >
        <Plus /> Add deliverable
      </Button>
    </>
  )
}
