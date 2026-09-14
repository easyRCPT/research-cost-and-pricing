import type { ReactNode } from "react"
import { ChevronRight, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { money } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

/* ------------------------------------------------------------------ chrome */

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 flex h-15 items-center gap-4 bg-navy px-6 text-white">
      <div>
        <h1 className="text-base leading-tight font-bold">Research Costing and Pricing Tool</h1>
        <p className="text-xs text-white/60">Research, Innovation and Commercialisation</p>
      </div>
      <div className="flex-1" />
      {right}
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="size-6.5 rounded-full bg-white/35" />
        <span>Name</span>
      </div>
    </header>
  )
}

export interface RailSection {
  label?: string
  items: { id: string; label: string }[]
}

export function SideRail({
  sections, current, onSelect, locked = {},
}: {
  sections: RailSection[]
  current: string
  onSelect: (id: string) => void
  /** Ids that cannot be opened yet, mapped to the reason why. */
  locked?: Record<string, string>
}) {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-15 h-[calc(100vh-3.75rem)] overflow-y-auto border-r border-hairline bg-white px-3 py-5"
    >
      {sections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-6" : ""}>
          {section.label && (
            <h2 className="px-3 pb-2 text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {section.label}
            </h2>
          )}
          <ol className="space-y-1">
            {section.items.map((item) => {
              const active = item.id === current
              const lockedReason = locked[item.id]
              const button = (
                <button
                  aria-current={active ? "true" : undefined}
                  disabled={Boolean(lockedReason)}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-lg px-3 py-2 text-left text-[15px]",
                    lockedReason
                      ? "cursor-not-allowed font-medium text-muted-foreground/55"
                      : active
                        ? "bg-navy font-semibold text-white"
                        : "font-medium text-foreground hover:bg-black/5",
                  )}
                >
                  <span
                    className={cn(
                      "size-[7px] shrink-0 rounded-full",
                      lockedReason ? "bg-neutral-200" : active ? "bg-white" : "bg-neutral-300",
                    )}
                  />
                  {item.label}
                </button>
              )
              return (
                <li key={item.id}>
                  {lockedReason ? (
                    <Tooltip>
                      {/* A disabled button fires no pointer events, so the span takes the hover. */}
                      <TooltipTrigger asChild>
                        <span className="block">{button}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right">{lockedReason}</TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </nav>
  )
}

export function PageHead({
  title, subtitle, right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start">
      <div>
        <h3 className="text-[22px] leading-tight font-bold tracking-tight text-navy">{title}</h3>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex-1" />
      {right}
    </div>
  )
}


/* ------------------------------------------------------------------ panels */

/**
 * Explanation that only matters when it is asked for — the rule behind a
 * figure, or what a section is for. Kept off the page so the numbers lead.
 */
export function InfoTip({ children, label = "More about this" }: {
  children: ReactNode
  label?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className="inline-flex align-middle text-muted-foreground/70 transition-colors hover:text-navy"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-[340px] font-normal">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

export function Panel({
  title, info, description, children, className, collapsible = false, defaultOpen = false,
}: {
  title?: ReactNode
  /** Sits behind an info icon on the title instead of as standing text. */
  info?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
  /** Folds the panel away behind its title — for reference a reader rarely needs. */
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const heading = (
    <>
      {title}
      {info && <InfoTip>{info}</InfoTip>}
    </>
  )
  const body = (
    <>
      {description && (
        <p className="mt-0.5 mb-4 max-w-[80ch] text-[13px] text-muted-foreground">{description}</p>
      )}
      {children}
    </>
  )
  const shell = "mb-4 rounded-lg border border-hairline bg-white px-6 py-6"

  if (collapsible) {
    return (
      <details className={cn(shell, "group", className)} open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[15.5px] font-semibold text-navy [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          {heading}
        </summary>
        <div className="mt-4">{body}</div>
      </details>
    )
  }

  return (
    <section className={cn(shell, className)}>
      {title && (
        <h4
          className={cn(
            "flex items-center gap-2 text-[15.5px] font-semibold text-navy",
            !description && "mb-4",
          )}
        >
          {heading}
        </h4>
      )}
      {body}
    </section>
  )
}

export function PartBar({ children, info }: { children: ReactNode; info?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2 rounded-md bg-head px-3 py-1.5 text-[13.5px] font-semibold text-navy first:mt-0">
      {children}
      {info && <InfoTip>{info}</InfoTip>}
    </div>
  )
}

/* ------------------------------------------------------------------- forms */

export function FieldRow({
  label, hint, required, children, align = "start",
}: {
  label: ReactNode
  hint?: string
  required?: string
  children: ReactNode
  align?: "start" | "center"
}) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-[250px_minmax(0,1fr)]">
      <label
        className={cn(
          "text-[13.5px] font-medium md:text-right",
          align === "start" ? "md:pt-2" : "md:pt-0",
        )}
      >
        {label}
        {required && <span className="text-bad">{required}</span>}
        {hint && <small className="block text-[11.5px] font-normal text-muted-foreground">{hint}</small>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-2 max-w-[84ch] text-[12.5px] text-muted-foreground", className)}>{children}</p>
  )
}

const NONE = "__none"

export function Choice({
  value, onChange, options, placeholder, className, allowBlank = true, disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[] | readonly { value: string; label: string }[]
  placeholder?: string
  className?: string
  allowBlank?: boolean
  /** Greyed out until whatever it depends on has been answered. */
  disabled?: boolean
}) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o))
  return (
    <Select
      value={value === "" ? NONE : value}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger
        disabled={disabled}
        className={cn(
          "w-full bg-white disabled:border-hairline disabled:bg-fill disabled:opacity-100",
          className,
        )}
      >
        <SelectValue placeholder={placeholder ?? ""} />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        {allowBlank && (
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">{placeholder ?? "—"}</span>
          </SelectItem>
        )}
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ---------------------------------------------------------------- banners */

export function Banner({
  tone = "info", icon, children,
}: {
  tone?: "info" | "warn" | "good" | "bad" | "inkind"
  icon?: ReactNode
  children: ReactNode
}) {
  const tones = {
    info: "bg-fill border-hairline-soft text-foreground",
    warn: "bg-warn-bg border-warn-line text-warn",
    good: "bg-good-bg border-good/25 text-good",
    bad: "bg-bad-bg border-bad/25 text-bad",
    inkind: "bg-inkind-bg border-inkind/25 text-inkind",
  }
  const marks = { info: "i", warn: "!", good: "✓", bad: "!", inkind: "◱" }
  return (
    <div className={cn("mb-4 flex items-start gap-3 rounded-md border px-3.5 py-2.5 text-[13px]", tones[tone])}>
      <span className="font-bold">{icon ?? marks[tone]}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/* ---------------------------------------------------------------- actions */

export function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-2 mb-8 flex justify-end gap-2.5">{children}</div>
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="lg" onClick={onClick}>
      Back
    </Button>
  )
}

export function NextButton({
  onClick, children, disabled, disabledReason,
}: {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  /** Shown on hover when the step cannot be left yet. */
  disabledReason?: string
}) {
  const button = (
    <Button size="lg" disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  )
  if (!disabled || !disabledReason) return button
  return (
    <Tooltip>
      {/* A disabled button fires no pointer events, so the span takes the hover. */}
      <TooltipTrigger asChild>
        <span className="inline-block">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{disabledReason}</TooltipContent>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ money */

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn("tabular", className)}>{money(value)}</span>
}

export function Signed({ value }: { value: number }) {
  return (
    <span className={cn("tabular", value < 0 ? "text-bad" : "text-good")}>{money(value)}</span>
  )
}
