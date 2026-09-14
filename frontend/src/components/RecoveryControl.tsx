import { Info } from "lucide-react"
import { MultiplierField } from "@/components/MultiplierField"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProject } from "@/state/project"
import { RECOVERY } from "@/lib/rcpt-engine"

/**
 * The one place the cost recovery multiplier is set. It sits in the page head
 * of every costing and pricing screen, so the figure driving all of them is
 * always in reach and never duplicated into a screen of its own.
 */
export function RecoveryControl() {
  const { project, summary, set } = useProject()
  const noRecovery = project.noCostRecovery

  return (
    <div className="flex flex-col items-end gap-2.5">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          Cost recovery multiplier
          <Tooltip>
            <TooltipTrigger
              aria-label="What the multiplier can be set to"
              className="text-muted-foreground/70 transition-colors hover:text-navy"
            >
              <Info className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="normal-case">
              <span className="font-semibold">
                Priced between {RECOVERY.min.toFixed(2)} and {RECOVERY.max.toFixed(2)}.
              </span>{" "}
              Full cost recovery is {RECOVERY.basis.toFixed(2)} — anything below it prices the
              project under what it costs the University, and needs the Dean.
            </TooltipContent>
          </Tooltip>
        </span>
        <MultiplierField
          disabled={noRecovery}
          value={summary.multiplier}
          onChange={(v) => set("multiplier", v)}
          className="h-10 w-[92px] text-[17px] font-semibold text-navy disabled:bg-fill disabled:text-muted-foreground disabled:opacity-100"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted-foreground">
        <Checkbox
          checked={noRecovery}
          onCheckedChange={(v) => set("noCostRecovery", v === true)}
        />
        Budget with no cost recovery
      </label>
    </div>
  )
}
