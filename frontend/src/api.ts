import { summarise, type Project as CostingData } from "./rcpt-engine"

// Mock API layer — stands in for the backend while it's built in parallel.

export interface ProjectRecord {
  id: string
  title: string
  department: string
  chief_investigator: string
  funder: string
  scheme: string
  created_at: string
}

export interface CreateProjectInput {
  title: string
  department: string
  chief_investigator?: string
  funder: string
  scheme?: string
}

export type BudgetMode = "simple" | "full"

export type BudgetStatus =
  | "draft"
  | "submitted"
  | "hod_review"
  | "dean_review"
  | "approved"
  | "withdrawn"

export interface BudgetRecord {
  id: string
  project_id: string
  mode: BudgetMode
  cost_multiplier: number
  in_kind_multiplier: number
  gst_applicable: boolean
  cash_co_contribution: number
  comments: string
  status: BudgetStatus
  created_at: string
  updated_at: string
  data: CostingData
  priceSummary: PriceSummary | null
  frontendChecks: FrontendChecks | null
}

export interface PriceSummary {
  staff_cost: number
  non_staff_cost: number
  project_cost: number

  in_kind_staff_cost: number
  in_kind_non_staff_cost: number
  in_kind_project_cost: number

  staff_cost_percentage: number
  non_staff_cost_percentage: number
  total_project_cost: number

  total_price_exc_gst: number
  total_price_inc_gst: number

  cash_benefit: number
  total_in_kind_contribution: number
  total_cash_co_contribution: number
  university_position: number
}

/**
 * Dean-required / trigger logic — currently only exists in rcpt-engine.ts,
 * not in the backend's Python calculation. Kept separate from PriceSummary
 * on purpose: when the backend adds this, these fields should move into (or
 * alongside) price_summary rather than silently vanishing from here.
 */
export interface FrontendChecks {
  triggers: string[]
  deanRequired: boolean
  minRecovery: number
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Mock network behaviour — remove this whole section when wiring real fetch.
// ---------------------------------------------------------------------------

const LATENCY_MS = 350

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

// ---------------------------------------------------------------------------
// Mock store — stands in for Postgres.
// ---------------------------------------------------------------------------

const projects = new Map<string, ProjectRecord>()
const budgets = new Map<string, BudgetRecord>()

let projectSeq = 0
let budgetSeq = 0
const nextProjectId = () => `project_${++projectSeq}`
const nextBudgetId = () => `budget_${++budgetSeq}`

function requireProject(id: string): ProjectRecord {
  const record = projects.get(id)
  if (!record) throw new ApiError(`Project ${id} not found`, 404)
  return record
}

function requireBudget(id: string): BudgetRecord {
  const record = budgets.get(id)
  if (!record) throw new ApiError(`Budget ${id} not found`, 404)
  return record
}

function touch(record: BudgetRecord): BudgetRecord {
  record.updated_at = new Date().toISOString()
  return record
}

/** Builds the FrontendChecks stand-in from the existing rcpt-engine.ts logic. */
function computeFrontendChecks(data: CostingData): FrontendChecks {
  const s = summarise(data)
  return { triggers: s.triggers, deanRequired: s.deanRequired, minRecovery: s.minRecovery }
}

/** Builds a PriceSummary shaped exactly like the backend's, from local data. */
function computePriceSummary(data: CostingData): PriceSummary {
  const s = summarise(data)
  const totalPriceExcGst = s.price
  const totalPriceIncGst = s.gstApplies ? s.price + s.gst : s.price
  return {
    staff_cost: s.staffPrice,
    non_staff_cost: s.nonStaff,
    project_cost: s.projectCost,
    in_kind_staff_cost: s.inKindStaffPrice,
    in_kind_non_staff_cost: s.inKindNonStaff,
    in_kind_project_cost: s.inKindTotal,
    staff_cost_percentage: s.projectCost ? s.staffPrice / s.projectCost : 0,
    non_staff_cost_percentage: s.projectCost ? s.nonStaff / s.projectCost : 0,
    total_project_cost: s.totalCost,
    total_price_exc_gst: totalPriceExcGst,
    total_price_inc_gst: totalPriceIncGst,
    cash_benefit: s.cashBenefit,
    total_in_kind_contribution: s.inKindTotalFull,
    total_cash_co_contribution: data.cashCoContribution || 0,
    university_position: s.universityPosition,
  }
}

// ---------------------------------------------------------------------------
// Endpoints — Projects
// ---------------------------------------------------------------------------

/** GET /projects */
export async function listProjects(): Promise<ProjectRecord[]> {
  const items = Array.from(projects.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
  return delay(items)
}

/** GET /projects/:id */
export async function getProject(id: string): Promise<ProjectRecord> {
  return delay(requireProject(id))
}

/** POST /projects */
export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  const record: ProjectRecord = {
    id: nextProjectId(),
    title: input.title,
    department: input.department,
    chief_investigator: input.chief_investigator ?? "",
    funder: input.funder,
    scheme: input.scheme ?? "",
    created_at: new Date().toISOString(),
  }
  projects.set(record.id, record)
  return delay(record)
}

/** GET /projects/:id/budgets */
export async function listBudgets(projectId: string): Promise<BudgetRecord[]> {
  requireProject(projectId)
  const items = Array.from(budgets.values())
    .filter((b) => b.project_id === projectId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return delay(items)
}

// ---------------------------------------------------------------------------
// Endpoints — Budgets
// ---------------------------------------------------------------------------

/** GET /budgets/:id */
export async function getBudget(id: string): Promise<BudgetRecord> {
  return delay(requireBudget(id))
}

/** POST /projects/:id/budgets — start a new costing attempt for a project. */
export async function createBudget(
  projectId: string,
  mode: BudgetMode,
  initialData: CostingData,
): Promise<BudgetRecord> {
  requireProject(projectId)
  const now = new Date().toISOString()
  const record: BudgetRecord = {
    id: nextBudgetId(),
    project_id: projectId,
    mode,
    cost_multiplier: initialData.multiplier,
    in_kind_multiplier: initialData.multiplier,
    gst_applicable: initialData.researchType === "contract",
    cash_co_contribution: initialData.cashCoContribution || 0,
    comments: "",
    status: "draft",
    created_at: now,
    updated_at: now,
    data: initialData,
    priceSummary: null,
    frontendChecks: null,
  }
  budgets.set(record.id, record)
  return delay(record)
}

/** PUT /budgets/:id — persist edits. Rejected once past draft. */
export async function saveBudget(id: string, data: CostingData): Promise<BudgetRecord> {
  const record = requireBudget(id)
  if (record.status !== "draft") {
    throw new ApiError(`Budget ${id} is ${record.status} and can no longer be edited`, 409)
  }
  record.data = data
  record.cash_co_contribution = data.cashCoContribution || 0
  return delay(touch(record))
}

/**
 * POST /budgets/:id/calculate — price the budget as it currently stands.
 * Does not persist status; used to refresh the on-screen summary as the user
 * edits. The frontend never computes cost/price/university-position itself.
 */
export async function calculateBudget(
  id: string,
  data: CostingData,
): Promise<{ priceSummary: PriceSummary; frontendChecks: FrontendChecks }> {
  requireBudget(id) // 404s if missing, same as a real endpoint would
  // Mock only — the real backend owns this via calculation/pricing.py.
  return delay({
    priceSummary: computePriceSummary(data),
    frontendChecks: computeFrontendChecks(data),
  })
}

/** POST /budgets/:id/submit — locks editing, starts HOD review. */
export async function submitForApproval(id: string): Promise<BudgetRecord> {
  const record = requireBudget(id)
  if (record.status !== "draft") {
    throw new ApiError(`Budget ${id} has already been submitted`, 409)
  }
  record.priceSummary = computePriceSummary(record.data)
  record.frontendChecks = computeFrontendChecks(record.data)
  record.status = "hod_review"
  return delay(touch(record))
}

/**
 * POST /budgets/:id/decision — HOD or Dean actions a budget under review.
 * Approving from hod_review moves to dean_review only if deanRequired was
 * true at submission time; otherwise it goes straight to approved.
 */
export async function decideApproval(
  id: string,
  decision: "approve" | "withdraw",
  comments?: string,
): Promise<BudgetRecord> {
  const record = requireBudget(id)
  if (record.status !== "hod_review" && record.status !== "dean_review") {
    throw new ApiError(`Budget ${id} is not awaiting a decision`, 409)
  }
  if (decision === "withdraw") {
    record.status = "withdrawn"
  } else if (record.status === "hod_review" && record.frontendChecks?.deanRequired) {
    record.status = "dean_review"
  } else {
    record.status = "approved"
  }
  if (comments) record.comments = comments
  return delay(touch(record))
}