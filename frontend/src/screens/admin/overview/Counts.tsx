export function Counts({
  rows,
}: {
  rows: { label: string; count: number; total?: boolean }[]
}) {
  return (
    <table className="w-full text-[13.5px]">
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={
              row.total
                ? 'border-t font-semibold'
                : 'border-b border-border/60 last:border-0'
            }
          >
            <td className="py-1.5 pr-3">{row.label}</td>
            <td className="tabular py-1.5 text-right font-semibold">
              {row.count}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
