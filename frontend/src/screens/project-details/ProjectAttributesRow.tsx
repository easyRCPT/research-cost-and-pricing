import { FieldRow } from '@/components/shell'
import { Attribute } from '@/components/ui/attribute'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Activity, ProjectInfo, Region } from '@/types'

interface ProjectAttributesRowProps {
  project: ProjectInfo
  activities: Activity[]
  regions: Region[]
  onChange: (patch: Partial<ProjectInfo>) => void
}

export function ProjectAttributesRow({
  project,
  activities,
  regions,
  onChange,
}: ProjectAttributesRowProps) {
  return (
    <FieldRow label="Project attributes" sublabelled>
      {/* The codes size to themselves; the pickers take a width instead of a
          share, so neither stretches to fill the row. Region is the widest
          because its names are — the longest one still fits on one line. */}
      <div className="grid max-w-180 grid-cols-2 gap-3 rounded-md bg-muted/60 px-4 py-3 md:w-fit md:grid-cols-[auto_auto_9.5rem_18rem] md:gap-5">
        <Attribute label="Company" value={project.company} />
        <Attribute label="Cost centre" value={project.cost_centre || null} />
        {/* Activity Picker */}
        <label className="block">
          <span className="block text-xs text-muted-foreground">Activity</span>
          <Select
            value={project.activity ?? ''}
            onValueChange={(activity) => onChange({ activity })}
          >
            <SelectTrigger size="sm" className="mt-0.5 w-full bg-white">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {activities.map((o) => (
                <SelectItem key={o.code} value={o.code}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {/* Region Picker */}
        <label className="block">
          <span className="block text-xs text-muted-foreground">Region</span>
          <Select
            value={project.region ?? ''}
            onValueChange={(region) => onChange({ region })}
          >
            <SelectTrigger size="sm" className="mt-0.5 w-full bg-white">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((o) => (
                <SelectItem key={o.code} value={o.code}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="mt-2 flex max-w-180 items-baseline gap-3 px-4 text-[13px]">
        <span className="text-muted-foreground">Account string</span>
        <span className="tabular">
          {project.account_string || (
            <span className="text-muted-foreground">
              Select an activity and region
            </span>
          )}
        </span>
      </div>
    </FieldRow>
  )
}
