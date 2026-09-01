import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import {
  emptyProject, summarise, projectYears,
  blankStaffRow as blank, blankNonStaffRow as blankNon,
  type NonStaffRow, type Project, type StaffRow, type Summary,
} from "@/lib/rcpt-engine"

interface ProjectContextValue {
  project: Project
  summary: Summary
  years: number[]
  set: <K extends keyof Project>(key: K, value: Project[K]) => void
  /** Several fields at once, for changes that have to stay consistent together. */
  patch: (values: Partial<Project>) => void
  patchStaff: (id: string, patch: Partial<StaffRow>) => void
  patchNonStaff: (id: string, patch: Partial<NonStaffRow>) => void
  addStaff: (inKind?: boolean) => void
  addNonStaff: () => void
  removeStaff: (id: string) => void
  removeNonStaff: (id: string) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({
  children, initial,
}: {
  children: ReactNode
  initial?: () => Project
}) {
  const [project, setProject] = useState<Project>(initial ?? (() => emptyProject(6, 6)))

  const value = useMemo<ProjectContextValue>(() => {
    const set: ProjectContextValue["set"] = (key, val) =>
      setProject((p) => ({ ...p, [key]: val }))

    return {
      project,
      summary: summarise(project),
      years: projectYears(project),
      set,
      patch: (values) => setProject((p) => ({ ...p, ...values })),
      patchStaff: (id, patch) =>
        setProject((p) => ({
          ...p,
          staff: p.staff.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      patchNonStaff: (id, patch) =>
        setProject((p) => ({
          ...p,
          nonStaff: p.nonStaff.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      addStaff: (inKind = false) =>
        setProject((p) => ({ ...p, staff: [...p.staff, blank(inKind)] })),
      addNonStaff: () =>
        setProject((p) => ({ ...p, nonStaff: [...p.nonStaff, blankNon()] })),
      removeStaff: (id) =>
        setProject((p) => ({ ...p, staff: p.staff.filter((r) => r.id !== id) })),
      removeNonStaff: (id) =>
        setProject((p) => ({ ...p, nonStaff: p.nonStaff.filter((r) => r.id !== id) })),
    }
  }, [project])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProject must be used inside <ProjectProvider>")
  return ctx
}
