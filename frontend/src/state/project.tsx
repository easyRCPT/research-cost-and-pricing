import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react"
import {
  emptyProject, summarise, projectYears,
  blankStaffRow as blank, blankNonStaffRow as blankNon,
  type NonStaffRow, type Project, type StaffRow, type Summary,
} from "@/lib/rcpt-engine"
import * as api from "@/lib/api"
import {
  PROJECT_FIELD_MAP, BUDGET_FIELD_MAP, STAFF_FIELD_MAP, NON_STAFF_FIELD_MAP,
  type BudgetStatus, type BudgetMeta,
} from "@/lib/api"

const DEBOUNCE_MS = 500

interface ProjectContextValue {
  project: Project
  /**
   * Full local breakdown (staffByBucket, triggers, cat1Exempt, multiplier,
   * deanRequired, minRecovery, etc). Computed on every edit via rcpt-engine.ts.
   * Kept as the source of truth for on-screen figures because it includes
   * things the backend's budget_summary doesn't yet (dean-required/triggers).
   * For a real (backend-loaded) budget, `serverSummary` below reflects what
   * the backend actually computed after the last successful patch.
   */
  summary: Summary
  serverSummary: api.BudgetSummary | null
  meta: BudgetMeta | null
  years: number[]
  set: <K extends keyof Project>(key: K, value: Project[K]) => void
  patch: (values: Partial<Project>) => void
  patchStaff: (id: string, patch: Partial<StaffRow>) => void
  patchNonStaff: (id: string, patch: Partial<NonStaffRow>) => void
  addStaff: (inKind?: boolean) => void
  addNonStaff: () => void
  removeStaff: (id: string) => void
  removeNonStaff: (id: string) => void
  isBackedByRealBudget: boolean
  budgetId: number | null
  status: BudgetStatus | null
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
  /** Pass a real backend budget id (e.g. from `manage.py seed`) to load and
   * persist against the actual API. Omit it to fall back to the in-memory
   * mock flow, for working on the UI without a running backend. */
  budgetId?: number
}) {
  const [project, setProject] = useState<Project>(initial ?? (() => emptyProject(6, 6)))
  const [serverSummary, setServerSummary] = useState<api.BudgetSummary | null>(null)
  const [meta, setMeta] = useState<BudgetMeta | null>(null)
  const [budgetId, setBudgetId] = useState<number | null>(null)
  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [isBackedByRealBudget, setIsBackedByRealBudget] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)
  const debounceTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    async function init() {
      try {
        if (loadBudgetId != null) {
          const detail = await api.getBudgetDetail(loadBudgetId)
          setProject(api.budgetDetailToProject(detail))
          setMeta(api.budgetDetailToMeta(detail))
          setServerSummary(detail.budget_summary)
          setBudgetId(loadBudgetId)
          setStatus(detail.budget_info.status)
          setIsBackedByRealBudget(true)
          return
        }
        // No real budget id given — fall back to the mock flow so the UI is
        // still usable without a running backend.
        const proj = await api.createProject({
          title: "Untitled project", department: "", funder: "",
        })
        const mockBudget = await api.createMockBudget(proj.id, "full", project)
        setBudgetId(mockBudget.id)
        setStatus(mockBudget.status)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialise budget")
      } finally {
        setInitializing(false)
      }
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function schedulePatch(
    section: api.PatchSection,
    fieldMap: Record<string, string | null>,
    localField: string,
    value: unknown,
    rowId?: number,
  ) {
    if (!isBackedByRealBudget || budgetId == null) return
    const backendField = fieldMap[localField]
    if (backendField === undefined) {
      console.warn(`No backend mapping for ${section}.${localField} — not persisted.`)
      return
    }
    if (backendField === null) return // known-unsupported field, local-only for now

    const key = `${section}:${rowId ?? ""}:${backendField}`
    const timers = debounceTimers.current
    clearTimeout(timers.get(key))
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key)
        setSaving(true)
        api.patchBudgetField(budgetId, section, backendField, value, rowId)
          .then((detail) => {
            if (detail) setServerSummary(detail.budget_summary)
            setError(null)
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : `Failed to save ${localField}`)
          })
          .finally(() => setSaving(false))
      }, DEBOUNCE_MS),
    )
  }

  const value = useMemo<ProjectContextValue>(() => {
    const set: ProjectContextValue["set"] = (key, val) => {
      setProject((p) => ({ ...p, [key]: val }))
      const k = key as string
      if (k in PROJECT_FIELD_MAP) schedulePatch("project", PROJECT_FIELD_MAP, k, val)
      else if (k in BUDGET_FIELD_MAP) schedulePatch("budget", BUDGET_FIELD_MAP, k, val)
    }

    const isReadOnly = status !== null && status !== "draft"

    return {
      project,
      summary: summarise(project),
      serverSummary,
      meta,
      years: projectYears(project),
      set,
      patch: (values) => {
        setProject((p) => ({ ...p, ...values }))
        for (const [k, v] of Object.entries(values)) {
          if (k in PROJECT_FIELD_MAP) schedulePatch("project", PROJECT_FIELD_MAP, k, v)
          else if (k in BUDGET_FIELD_MAP) schedulePatch("budget", BUDGET_FIELD_MAP, k, v)
        }
      },
      patchStaff: (id, patch) => {
        setProject((p) => ({
          ...p,
          staff: p.staff.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }))
        const rowId = Number(id)
        for (const [k, v] of Object.entries(patch)) {
          if (k === "time") {
            // Per-year values PATCH using the year itself as the field name.
            const years = projectYears(project)
            ;(v as number[]).forEach((amount, i) => {
              schedulePatch("staff", {}, String(years[i]), amount, rowId)
            })
            continue
          }
          schedulePatch("staff", STAFF_FIELD_MAP, k, v, rowId)
        }
      },
      patchNonStaff: (id, patch) => {
        setProject((p) => ({
          ...p,
          nonStaff: p.nonStaff.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }))
        const rowId = Number(id)
        for (const [k, v] of Object.entries(patch)) {
          if (k === "amounts") {
            const years = projectYears(project)
            ;(v as number[]).forEach((amount, i) => {
              schedulePatch("non_staff", {}, String(years[i]), amount, rowId)
            })
            continue
          }
          schedulePatch("non_staff", NON_STAFF_FIELD_MAP, k, v, rowId)
        }
      },
      // Adding/removing rows has no backend endpoint yet (no create/delete
      // for staff or non-staff lines) — local-state only until that exists.
      addStaff: (inKind = false) =>
        setProject((p) => ({ ...p, staff: [...p.staff, blank(inKind)] })),
      addNonStaff: () =>
        setProject((p) => ({ ...p, nonStaff: [...p.nonStaff, blankNon()] })),
      removeStaff: (id) =>
        setProject((p) => ({ ...p, staff: p.staff.filter((r) => r.id !== id) })),
      removeNonStaff: (id) =>
        setProject((p) => ({ ...p, nonStaff: p.nonStaff.filter((r) => r.id !== id) })),

      isBackedByRealBudget,
      budgetId,
      status,
      isReadOnly,
      initializing,
      saving,
      submitting,
      error,
      save: async () => {
        if (isBackedByRealBudget) return // real edits already persist per-field
        if (!budgetId) return
        setSaving(true)
        setError(null)
        try {
          await api.saveMockBudget(budgetId, project)
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
          if (!isBackedByRealBudget) {
            await api.saveMockBudget(budgetId, project)
          }
          // No real submit endpoint exists yet — this always goes through
          // the mock flow for now, even for a real-budget id.
          const record = await api.submitForApproval(budgetId)
          setStatus(record.status)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to submit for approval")
        } finally {
          setSubmitting(false)
        }
      },
    }
  }, [
    project, serverSummary, meta, budgetId, status, isBackedByRealBudget,
    initializing, saving, submitting, error,
  ])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error("useProject must be used inside <ProjectProvider>")
  return ctx
}