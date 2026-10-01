import { useState } from 'react'
import { toast } from 'sonner'
import { useLookups } from '@/api/lookups'
import { useAddRate, useUpdateRate } from '@/api/admin-lookups'
import { Grid, PageHead, Panel, Td, Th } from '@/components/shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api'
import { RATE_TABLES, type RateTableSpec } from './rateTables'
import { VersionsPanel } from './VersionsPanel'

type Row = Record<string, unknown>

const keyOf = (spec: RateTableSpec, row: Row) =>
  Object.fromEntries(spec.key.map((k) => [k.field, row[k.field] ?? null]))

const keyText = (spec: RateTableSpec, row: Row) =>
  spec.key.map((k) => String(row[k.field] ?? '')).join('|')

const failed = (error: unknown) =>
  toast.error('Not saved', {
    description: error instanceof ApiError ? error.message : 'Try again.',
  })

/**
 * The rates that price a costing, editable (#68).
 *
 * Built on the versioned tables as they are: an edit changes a row of the
 * current version, and once any costing has been submitted on that version the
 * server copies the whole set into a new one first. So a costing already
 * submitted keeps the rates it was submitted with, and any older set can be
 * put back from the versions panel (#137).
 */
export function LookupEditor() {
  const { data: lookups } = useLookups()
  const [tableId, setTableId] = useState(RATE_TABLES[0].id)
  const spec = RATE_TABLES.find((table) => table.id === tableId) ?? RATE_TABLES[0]
  const rows = (lookups[spec.id] ?? []) as unknown as Row[]

  return (
    <>
      <PageHead title="Lookup tables" subtitle="The rates every costing is priced with" />

      <Alert className="mb-4">
        <AlertDescription>
          A change here reprices every draft and every new costing straight
          away. Costings already submitted keep the rates they were submitted
          with, and any earlier set of rates can be put back below.
        </AlertDescription>
      </Alert>

      <Tabs value={spec.id} onValueChange={(next) => setTableId(next as typeof tableId)}>
        <TabsList className="mb-4 flex-wrap">
          {RATE_TABLES.map((table) => (
            <TabsTrigger key={table.id} value={table.id}>
              {table.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Panel title={spec.label}>
        <Grid>
          <thead>
            <tr>
              {spec.key.map((k) => (
                <Th key={k.field}>{k.label}</Th>
              ))}
              <Th className="text-right">{spec.value.label}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <RateRow key={keyText(spec, row)} spec={spec} row={row} />
            ))}
          </tbody>
        </Grid>
        <AddRow spec={spec} />
      </Panel>

      <VersionsPanel />
    </>
  )
}

function RateRow({ spec, row }: { spec: RateTableSpec; row: Row }) {
  const update = useUpdateRate()
  const saved = Number(row[spec.value.field])
  const [draft, setDraft] = useState<number | null>(null)
  const changed = draft !== null && draft !== saved

  const save = () =>
    update.mutate(
      { table: spec.id, key: keyOf(spec, row), values: { [spec.value.field]: draft } },
      {
        onSuccess: () => {
          setDraft(null)
          toast.success('Saved', { description: `${spec.label}: ${keyText(spec, row).replaceAll('|', ' · ')}` })
        },
        onError: failed,
      },
    )

  return (
    <tr>
      {spec.key.map((k) => (
        <Td key={k.field}>{row[k.field] === null || row[k.field] === '' ? '—' : String(row[k.field])}</Td>
      ))}
      <Td className="text-right">
        <NumberInput
          className="tabular ml-auto h-8 w-36 text-right"
          step={spec.value.step}
          min={0}
          value={draft ?? saved}
          onChange={setDraft}
          aria-label={`${spec.value.label} for ${keyText(spec, row).replaceAll('|', ' ')}`}
        />
      </Td>
      <Td className="w-40">
        {changed && (
          <div className="flex gap-2">
            <Button size="sm" disabled={update.isPending} onClick={save}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => setDraft(null)}>
              Undo
            </Button>
          </div>
        )}
      </Td>
    </tr>
  )
}

function AddRow({ spec }: { spec: RateTableSpec }) {
  const add = useAddRate()
  const blank = () => Object.fromEntries([...spec.key.map((k) => [k.field, '']), [spec.value.field, '']])
  const [values, setValues] = useState<Record<string, string>>(blank)
  const ready = spec.key.every((k) => k.kind === 'number' || values[k.field]?.trim()) && values[spec.value.field] !== ''

  const submit = () => {
    const body: Record<string, unknown> = {}
    for (const k of spec.key) {
      const raw = values[k.field]?.trim() ?? ''
      body[k.field] = k.kind === 'number' ? (raw === '' ? null : Number(raw)) : raw
    }
    body[spec.value.field] = Number(values[spec.value.field])
    add.mutate(
      { table: spec.id, values: body },
      {
        onSuccess: () => {
          setValues(blank())
          toast.success('Row added', { description: spec.label })
        },
        onError: failed,
      },
    )
  }

  return (
    <div key={spec.id} className="mt-5 border-t pt-4">
      <div className="mb-2 text-[13px] font-medium">Add a row</div>
      <div className="flex flex-wrap items-end gap-3">
        {[...spec.key, { field: spec.value.field, label: spec.value.label, kind: 'number' as const }].map((k) => (
          <label key={k.field} className="grid gap-1 text-[12px] text-muted-foreground">
            {k.label}
            <Input
              className="h-8 w-40"
              type={k.kind === 'number' ? 'number' : 'text'}
              value={values[k.field] ?? ''}
              onChange={(event) => setValues({ ...values, [k.field]: event.target.value })}
            />
          </label>
        ))}
        <Button size="sm" disabled={!ready || add.isPending} onClick={submit}>
          {add.isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </div>
  )
}
