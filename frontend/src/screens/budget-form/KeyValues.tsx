interface KeyValuesProps {
  rows: [string, string][]
}

export function KeyValues({ rows }: KeyValuesProps) {
  return (
    <div className="grid md:grid-cols-[190px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13.5px]">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <span className="text-muted-foreground">{key}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}
