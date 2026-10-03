import { type EntryProps, type FieldKind, KINDS } from '@/screens/admin/fieldKinds'

/** A form field's control for its kind, with the server's complaint under it. */
export function FieldInput({
  kind,
  error,
  ...props
}: EntryProps & { kind: FieldKind }) {
  const Entry = KINDS[kind].entry
  return (
    <div className="grid gap-0.5">
      <Entry error={error} {...props} />
      {error && <span className="text-[12px] text-destructive">{error}</span>}
    </div>
  )
}
