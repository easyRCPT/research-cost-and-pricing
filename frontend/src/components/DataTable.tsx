import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NumberInput } from "@/components/NumberInput"
import { Choice } from "@/components/shell"

/**
 * Grid-style tables for the costing sheets: hairlines on every cell, a grey
 * header, and calculated cells shaded so entry cells read as the editable ones.
 *
 * Entry cells behave like a spreadsheet — the cell *is* the field. Nothing is
 * drawn inside it until it has focus, at which point a ring is inset on the
 * cell edge. See `cellField` below.
 */

/**
 * `wide` lets the table size itself to its content and scroll sideways, rather
 * than squeezing every column into the container. Columns are laid out
 * automatically, so a column carrying long values ends up wider than one that
 * holds a year total.
 */
export function Grid({
  children, className, wide = false,
}: {
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xs border border-hairline", className)}>
      <table className={cn("border-collapse text-[13px]", wide ? "w-max min-w-full" : "w-full")}>
        {children}
      </table>
    </div>
  )
}

export function Th({
  children, className, align = "left", ...rest
}: React.ComponentProps<"th"> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      {...rest}
      className={cn(
        "border-r border-b border-hairline bg-head px-1.5 py-1 align-bottom font-semibold whitespace-nowrap last:border-r-0",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children, className, align = "left", ...rest
}: React.ComponentProps<"td"> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      {...rest}
      className={cn(
        "border-r border-b border-hairline px-1 py-0.5 align-middle last:border-r-0",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  )
}

/** A read-only computed cell. */
export function Calc({ children, className, ...rest }: React.ComponentProps<"td">) {
  return (
    <td
      {...rest}
      className={cn(
        "tabular border-r border-b border-hairline bg-fill px-1.5 py-0.5 text-right align-middle last:border-r-0",
        className,
      )}
    >
      {children}
    </td>
  )
}

export function FootTd({ children, className, ...rest }: React.ComponentProps<"td">) {
  return (
    <td
      {...rest}
      className={cn(
        "tabular border-r border-hairline bg-head px-1.5 py-1 text-right font-semibold last:border-r-0",
        className,
      )}
    >
      {children}
    </td>
  )
}

/* ------------------------------------------------------------- entry cells */

/**
 * An editable cell: the field fills it edge to edge and draws no chrome of its
 * own, so a row reads as cells rather than a row of boxes. Focus insets a ring
 * on the cell itself; a locked cell greys out in place.
 */
const cellField =
  "h-8 w-full rounded-none border-0 bg-transparent px-1.5 text-[12.5px] shadow-none " +
  "focus-visible:ring-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy " +
  "disabled:cursor-not-allowed disabled:bg-fill disabled:text-muted-foreground disabled:opacity-100"

/** Wraps an entry cell so the field, not the padding, owns the whole cell. */
export function CellTd({ children, className, ...rest }: React.ComponentProps<typeof Td>) {
  return (
    <Td {...rest} className={cn("p-0", className)}>
      {children}
    </Td>
  )
}

export function CellText({
  className, ...rest
}: React.ComponentProps<typeof Input>) {
  return <Input {...rest} className={cn(cellField, "field-sizing-content", className)} />
}

/** Starts one line tall like any other cell and grows only once it needs to. */
export function CellNote({ className, ...rest }: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      rows={1}
      {...rest}
      // h-auto undoes cellField's fixed height, or the note cannot grow at all.
      className={cn(cellField, "h-auto min-h-8 resize-none py-1.5 leading-snug", className)}
    />
  )
}

export function CellNumber({
  className, prefix, ...rest
}: React.ComponentProps<typeof NumberInput> & { prefix?: string }) {
  const field = (
    <NumberInput
      {...rest}
      className={cn(
        cellField,
        "tabular no-spin field-sizing-content text-right",
        prefix && "pl-4",
        className,
      )}
    />
  )
  if (!prefix) return field
  return (
    <div className="relative flex">
      <span className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center text-[12px] text-muted-foreground">
        {prefix}
      </span>
      {field}
    </div>
  )
}

export function CellChoice({
  className, ...rest
}: React.ComponentProps<typeof Choice>) {
  return (
    <Choice
      {...rest}
      className={cn(
        cellField,
        "justify-between gap-1 [&>svg]:size-3.5 [&>svg]:opacity-45",
        "disabled:border-0 disabled:bg-fill",
        className,
      )}
    />
  )
}

/** Two-column ledger list used by the summary and budget form panels. */
export function Ledger({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={cn("w-full border-collapse text-[13.5px]", className)}>{children}</table>
}

export function LedgerRow({
  label, value, tone = "plain", indent, secondValue,
}: {
  label: ReactNode
  value: ReactNode
  secondValue?: ReactNode
  tone?: "plain" | "rule" | "total" | "muted"
  indent?: boolean
}) {
  const rowClass = {
    plain: "border-b border-hairline-soft",
    muted: "border-b border-hairline-soft text-muted-foreground",
    rule: "border-t border-neutral-400 font-semibold",
    total: "border-t-2 border-foreground text-[15.5px] font-bold",
  }[tone]
  return (
    <tr className={rowClass}>
      <td className={cn("py-1.5 pr-3", indent && "pl-5 text-muted-foreground")}>{label}</td>
      {secondValue !== undefined && <td className="tabular py-1.5 text-right">{secondValue}</td>}
      <td className="tabular py-1.5 text-right">{value}</td>
    </tr>
  )
}
