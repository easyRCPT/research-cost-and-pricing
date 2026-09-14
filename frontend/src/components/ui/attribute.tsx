export function Attribute({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value ?? '—'}</div>
    </div>
  )
}
