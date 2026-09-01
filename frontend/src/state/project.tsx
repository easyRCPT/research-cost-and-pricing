import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react"
import {
  emptyProject, summarise, projectYears,
  blankStaffRow as blank, blankNonStaffRow as blankNon,
  type NonStaffRow, type Project, type StaffRow, type Summary,
} from "@/lib/rcpt-engine"
import * as api from "@/lib/api"
import type { BudgetStatus } from "@/lib/api"

interface ProjectContextValue {
  project: Project
  /**
   * Full local breakdown (staffByBucket, triggers, cat1Exempt, multiplier,
   * deanRequired, minRecovery, etc). Computed on every edit via rcpt-engine.ts.
   * This stays the source of truth for on-screen figures because the
   * backend's price_summary doesn't yet return this level of detail —
   * see api.ts's file header. Once it does, this should be replaced by
   * whatever `calculateBudget()` returns instead of being computed here.
   */
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

  // --- backend-backed state, from api.ts ---
  /** Null until the initial create/load call resolves. */
  budgetId: string | null
  status: BudgetStatus | null
  /** True once status has moved past "draft" — screens should stop editing. */
  isReadOnly: boolean
  initializing: boolean
  saving: boolean
  submitting: boolean
  error: string | null
  save: () => Promise<void>
  submit: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({
  children, initial, budgetId: loadBudgetId,
}: {
  children: ReactNode
  initial?: () => Project
  /** Load an existing budget instead of creating a fresh draft on mount. */
  budgetId?: string
}) {
  const [project, setProject] = useState<Project>(initial ?? (() => emptyProject(6, 6)))
  const [budgetId, setBudgetId] = useState<string | null>(null)
  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)

  // Load an existing budget, or spin up a placeholder project + draft budget
  // so "Save draft" has somewhere real to write to from the very first edit.
  // Runs once; deliberately not re-run on `project` changes.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    async function init() {
      try {
        if (loadBudgetId) {
          const record = await api.getBudget(loadBudgetId)
          setProject(record.data)
          setBudgetId(record.id)
          setStatus(record.status)
          return
        }
        const proj = await api.createProject({
          title: "Untitled project",
          department: "",
          funder: "",
        })
        const budget = await api.createBudget(proj.id, "full", project)
        setBudgetId(budget.id)
        setStatus(budget.status)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialise budget")
      } finally {
        setInitializing(false)
      }
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<ProjectContextValue>(() => {
    const set: ProjectContextValue["set"] = (key, val) =>
      setProject((p) => ({ ...p, [key]: val }))

    const isReadOnly = status !== null && status !== "draft"

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

      budgetId,
      status,
      isReadOnly,
      initializing,
      saving,
      submitting,
      error,
      save: async () => {
        if (!budgetId) return
        setSaving(true)
        setError(null)
        try {
          await api.saveBudget(budgetId, project)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save draft")
        } finally {
          setSaving(false)
        }
      },
      submit: async () => {
        if (!budgetId) return
        setSubmitting(true)
        setError(null)
        try {
          // Persist the latest edits first, so what gets submitted matches
          // exactly what's shown on screen.
          await api.saveBudget(budgetId, project)
          const record = await api.submitForApproval(budgetId)
          setStatus(record.status)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to submit for approval")
        } finally {
          setSubmitting(false)
        }
      },
    }
  }, [project, budgetId, status, initializing, saving, submitting, error])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProject must be used inside <ProjectProvider>")
  return ctx
}