const SIGNATURE_LABELS = [
  'Signature',
  'Name (please print)',
  'Position (please print)',
  'Date',
]

interface SignatureBlockProps {
  title: string
}

export function SignatureBlock({ title }: SignatureBlockProps) {
  return (
    <div className="mt-4">
      <div className="text-[13.5px] font-semibold">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-5 md:grid-cols-4">
        {SIGNATURE_LABELS.map((label) => (
          <div key={label}>
            <div className="h-10 border-b border-neutral-400" />
            <span className="text-[12.5px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
