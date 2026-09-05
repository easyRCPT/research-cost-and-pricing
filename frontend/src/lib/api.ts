import { summarise, type Project as CostingData } from "./rcpt-engine"

/**
 * API layer for RCPT.
 *
 * Split into two halves, clearly marked:
 *
 * 1. REAL — talks to the actual Django backend. Currently only covers
 *    GET/PATCH on an existing budget (`getBudgetDetail`, `patchBudgetField`),
 *    since those are the only endpoints that exist
 *    (`backend/api/views.py` + `backend/api/services/budget_update.py`).
 * 2. MOCK — everything else (create project, create budget, submit for
 *    approval, decide approval). No real endpoints exist for these yet, so
 *    they're simulated in-memory, same as before.
 */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new ApiError(`Request failed (${res.status}): ${body || res.statusText}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// =============================================================================
// REAL — matches backend/api/serializers/budget_detail_serializer.py exactly.
// =============================================================================

export type BudgetMode = "simple" | "full"
export type BudgetStatus =
  | "draft" | "submitted" | "hod_review" | "dean_review" | "approved" | "withdrawn"

export interface ProjectInfo {
  title: string
  chief_investigator: string
  funder: string
  department: string
  faculty: string // read-only, derived from department server-side
  scheme: string
  start_year: number
  start_month: number
  end_year: number
  end_month: number
  company: string // read-only, follows department
  cost_centre: string // read-only, follows department
  activity: string | null
  region: string | null
  additional_information: string
}

export interface Deliverable {
  number: number
  description: string
  deliverable_type: string
  invoice_amount: number | null
  due_date: string
  dependency: number | null
  sponsor: string
}

export interface BudgetInfo {
  mode: BudgetMode
  cost_multiplier: number
  in_kind_multiplier: number
  gst_applicable: boolean
  cash_co_contribution: number
  comments: string
  status: BudgetStatus
  deliverables: Deliverable[]
}

interface YearValue { year: number; [k: string]: number }
interface Totals { by_year: { year: number; cost: number }[]; total: number }

export interface StaffLine {
  id: number
  name_role: string
  employment_type: string
  category: string
  classification: string
  time_basis: string
  in_kind: boolean
  rate_2025: number
  by_year: (YearValue & { time: number; cost: number })[]
  total: number
}
export interface StaffCost { lines: StaffLine[]; column_total: Totals }

export interface NonStaffLine {
  id: number
  cost_group: string // read name — writes use field "category" with a lookup id, see file header
  expense_type: string // currently read-only, no update handler exists yet
  description: string
  in_kind: boolean
  add_ten_percent: boolean
  indirect_rate_multiplier: number | null
  by_year: (YearValue & { amount: number })[]
  total: number
  direct_total: number
}
export interface NonStaffCost {
  lines: NonStaffLine[]
  direct_total: Totals
  indirect_total: Totals
  column_total: Totals
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

export interface StaffBudget {
  category_totals: Record<string, number>
  cost_before_recovery: number
  cost_recovery: number
  cost_recovery_multiplier: number
  total_staff_costs: number
}
export interface NonStaffBudget {
  category_totals: Record<string, number>
  direct_total: number
  indirect_cost_recovery: number
  total_non_staff_costs: number
}
export interface BudgetSummary {
  price_summary: PriceSummary
  staff_budget: StaffBudget
  non_staff_budget: NonStaffBudget
  in_kind_costs: {
    in_kind_staff_budget: StaffBudget
    in_kind_non_staff_budget: NonStaffBudget
    total_in_kind_costs: number
  }
}

/** GET /budgets/:id/ response — the full picture of one budget. */
export interface BudgetDetail {
  project_info: ProjectInfo
  budget_info: BudgetInfo
  years: number[]
  staff_cost: StaffCost
  staff_in_kind_cost: StaffCost
  non_staff_cost: NonStaffCost
  non_staff_in_kind_cost: NonStaffCost
  budget_summary: BudgetSummary
}

/** GET /budgets/:id/ */
export async function getBudgetDetail(budgetId: number): Promise<BudgetDetail> {
  return request<BudgetDetail>(`/budgets/${budgetId}/`)
}

export type PatchSection = "project" | "budget" | "staff" | "non_staff" | "deliverable"

/**
 * PATCH /budgets/:id/ — updates exactly one field. Returns a fresh
 * BudgetDetail if the backend recalculated anything (200), or null if not
 * (204) — e.g. editing `title` doesn't affect any figures.
 */
export async function patchBudgetField(
  budgetId: number,
  section: PatchSection,
  field: string,
  value: unknown,
  rowId?: number,
): Promise<BudgetDetail | null> {
  return request<BudgetDetail | null>(`/budgets/${budgetId}/`, {
    method: "PATCH",
    body: JSON.stringify({ section, row_id: rowId ?? null, field, value }),
  })
}

// ---------------------------------------------------------------------------
// Field-name translation: frontend (rcpt-engine.ts) key -> backend field name.
// `null` means "not updatable server-side yet" — callers should skip the
// network call and only update local state for that field.
// ---------------------------------------------------------------------------

export const PROJECT_FIELD_MAP: Record<string, string | null> = {
  title: "title",
  ci: "chief_investigator",
  funder: "funder",
  scheme: "scheme",
  notes: "additional_information",
  startYear: "start_year",
  startMonth: "start_month",
  endYear: "end_year",
  endMonth: "end_month",
  dept: "department", // value must be a department lookup id, not free text
  activity: "activity", // lookup id
  region: "region", // lookup id
  // Not modelled on the backend yet — kept local-only:
  otherFunder: null,
  otherFunderCategory: null,
  noCostRecovery: null,
  ciCostsIncluded: null,
  justification: null,
  justificationNotes: null,
  deanExemptionReason: null,
}

export const BUDGET_FIELD_MAP: Record<string, string | null> = {
  multiplier: "cost_multiplier", // in_kind_multiplier needs its own explicit patch, see note in project.tsx
  cashCoContribution: "cash_co_contribution",
}

export const STAFF_FIELD_MAP: Record<string, string | null> = {
  name: "name_role",
  employment: "employment_type",
  category: "category",
  classification: "classification",
  basis: "time_basis",
  inKind: "in_kind",
  inKindReason: null, // not modelled server-side yet
}

export const NON_STAFF_FIELD_MAP: Record<string, string | null> = {
  desc: "description",
  inKind: "in_kind",
  addTenPercent: "add_ten_percent",
  group: "category", // asymmetric: read as cost_group, write as category (lookup id)
  expense: null, // no update handler exists server-side yet — read-only for now
  inKindReason: null,
}

/**
 * Converts a real BudgetDetail into the frontend's existing editable Project
 * shape (rcpt-engine.ts), so screens don't need to change at all. Fields the
 * backend doesn't model yet (justification notes, dean exemption, etc.) are
 * defaulted — they're not currently round-tripped to the server.
 */
export function budgetDetailToProject(detail: BudgetDetail): CostingData {
  return {
    title: detail.project_info.title,
    ci: detail.project_info.chief_investigator,
    funder: detail.project_info.funder,
    otherFunder: "",
    otherFunderCategory: "",
    scheme: detail.project_info.scheme,
    dept: detail.project_info.department,
    activity: detail.project_info.activity ?? "",
    region: detail.project_info.region ?? "",
    notes: detail.project_info.additional_information,
    researchType: detail.budget_info.gst_applicable ? "contract" : "noncat1",
    startYear: detail.project_info.start_year,
    startMonth: detail.project_info.start_month,
    endYear: detail.project_info.end_year,
    endMonth: detail.project_info.end_month,
    multiplier: detail.budget_info.cost_multiplier,
    noCostRecovery: false,
    ciCostsIncluded: false,
    justification: "",
    justificationNotes: "",
    deanExemptionReason: "",
    cashCoContribution: detail.budget_info.cash_co_contribution,
    staff: detail.staff_cost.lines.map((line) => ({
      id: String(line.id),
      name: line.name_role,
      employment: line.employment_type,
      category: line.category,
      classification: line.classification,
      basis: line.time_basis,
      time: detail.years.map(
        (year) => line.by_year.find((y) => y.year === year)?.time ?? 0,
      ),
      inKind: line.in_kind,
      inKindReason: "",
    })),
    nonStaff: detail.non_staff_cost.lines.map((line) => ({
      id: String(line.id),
      group: line.cost_group,
      expense: line.expense_type,
      desc: line.description,
      amounts: detail.years.map(
        (year) => line.by_year.find((y) => y.year === year)?.amount ?? 0,
      ),
      inKind: line.in_kind,
      addTenPercent: line.add_ten_percent,
      inKindReason: "",
    })),
  }
}

/** Extra backend-known info that doesn't belong in the editable Project shape. */
export interface BudgetMeta {
  faculty: string
  company: string
  costCentre: string
  mode: BudgetMode
  status: BudgetStatus
  deliverables: Deliverable[]
}

export function budgetDetailToMeta(detail: BudgetDetail): BudgetMeta {
  return {
    faculty: detail.project_info.faculty,
    company: detail.project_info.company,
    costCentre: detail.project_info.cost_centre,
    mode: detail.budget_info.mode,
    status: detail.budget_info.status,
    deliverables: detail.budget_info.deliverables,
  }
}

// =============================================================================
// MOCK — no real endpoints exist yet for any of this (create, submit, decide).
// =============================================================================

export interface MockProjectRecord {
  id: number
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

export interface MockBudgetRecord {
  id: number
  project_id: number
  mode: BudgetMode
  status: BudgetStatus
  data: CostingData
  priceSummary: PriceSummary | null
  frontendChecks: FrontendChecks | null
  createdAt: string
  updatedAt: string
}

/**
 * Dean-required / trigger logic — only exists in rcpt-engine.ts, not ported
 * to the backend's Python calculation yet. Kept separate from PriceSummary
 * on purpose: if the backend adds this, it should move into (or alongside)
 * budget_summary.price_summary rather than silently vanishing from here.
 */
export interface FrontendChecks {
  triggers: string[]
  deanRequired: boolean
  minRecovery: number
}

function computeFrontendChecks(data: CostingData): FrontendChecks {
  const s = summarise(data)
  return { triggers: s.triggers, deanRequired: s.deanRequired, minRecovery: s.minRecovery }
}

function computePriceSummary(data: CostingData): PriceSummary {
  const s = summarise(data)
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
    total_price_exc_gst: s.price,
    total_price_inc_gst: s.gstApplies ? s.price + s.gst : s.price,
    cash_benefit: s.cashBenefit,
    total_in_kind_contribution: s.inKindTotalFull,
    total_cash_co_contribution: data.cashCoContribution || 0,
    university_position: s.universityPosition,
  }
}

const mockProjects = new Map<number, MockProjectRecord>()
const mockBudgets = new Map<number, MockBudgetRecord>()
let projectSeq = 0
let budgetSeq = 0

const MOCK_LATENCY_MS = 350
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

function requireMockBudget(id: number): MockBudgetRecord {
  const record = mockBudgets.get(id)
  if (!record) throw new ApiError(`Mock budget ${id} not found`, 404)
  return record
}

export async function createProject(input: CreateProjectInput): Promise<MockProjectRecord> {
  const record: MockProjectRecord = {
    id: ++projectSeq,
    title: input.title,
    department: input.department,
    chief_investigator: input.chief_investigator ?? "",
    funder: input.funder,
    scheme: input.scheme ?? "",
    created_at: new Date().toISOString(),
  }
  mockProjects.set(record.id, record)
  return delay(record)
}

export async function createMockBudget(
  projectId: number,
  mode: BudgetMode,
  initialData: CostingData,
): Promise<MockBudgetRecord> {
  const now = new Date().toISOString()
  const record: MockBudgetRecord = {
    id: ++budgetSeq,
    project_id: projectId,
    mode,
    status: "draft",
    data: initialData,
    priceSummary: null,
    frontendChecks: null,
    createdAt: now,
    updatedAt: now,
  }
  mockBudgets.set(record.id, record)
  return delay(record)
}

export async function saveMockBudget(id: number, data: CostingData): Promise<MockBudgetRecord> {
  const record = requireMockBudget(id)
  if (record.status !== "draft") {
    throw new ApiError(`Budget ${id} is ${record.status} and can no longer be edited`, 409)
  }
  record.data = data
  record.updatedAt = new Date().toISOString()
  return delay(record)
}

export async function submitForApproval(id: number): Promise<MockBudgetRecord> {
  const record = requireMockBudget(id)
  if (record.status !== "draft") {
    throw new ApiError(`Budget ${id} has already been submitted`, 409)
  }
  record.priceSummary = computePriceSummary(record.data)
  record.frontendChecks = computeFrontendChecks(record.data)
  record.status = "hod_review"
  record.updatedAt = new Date().toISOString()
  return delay(record)
}

export async function decideApproval(
  id: number,
  decision: "approve" | "withdraw",
): Promise<MockBudgetRecord> {
  const record = requireMockBudget(id)
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
  record.updatedAt = new Date().toISOString()
  return delay(record)
}