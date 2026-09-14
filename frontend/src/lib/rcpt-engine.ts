import { SALARY_RATES } from "./salary-rates"
import { COST_CATEGORIES, EBA_INCREASE, SALARY_MAX_STEP } from "./lookups"

export { SALARY_RATES, SALARY_MAX_STEP }
export * from "./lookups"

export const RATE_BASIS: Record<string, number> = { FTE: 1, Daily: 1 / 220, Hourly: 1 }

export const EBA_BASE_YEAR = 2025

/** Compounded EBA increases from the base year up to and including `year`. */
export const ebaMultiplier = (year: number) => {
  let m = 1
  for (let y = EBA_BASE_YEAR + 1; y <= year; y++) m *= 1 + (EBA_INCREASE[y] ?? 0)
  return m
}

export const ONCOSTS = {
  leaveLoading: { Continuing: 0.0134, "Fixed-Term": 0.0134, Casual: 0 } as Record<string, number>,
  superannuation: { Continuing: 0.17, "Fixed-Term": 0.17, Casual: 0.12 } as Record<string, number>,
  payrollTax: 0.0585,
  workcover: { Continuing: 0.005, "Fixed-Term": 0.005, Casual: 0.005 } as Record<string, number>,
  longServiceLeave: { Continuing: 0.005, "Fixed-Term": 0.005, Casual: 0 } as Record<string, number>,
  parentalLeave: { Continuing: 0.01, "Fixed-Term": 0.01, Casual: 0 } as Record<string, number>,
  annualLeaveProvision: { Continuing: 0.12, "Fixed-Term": 0.12, Casual: 0 } as Record<string, number>,
}

export const MAX_LEAVE_LOADING = 1611.3
export const WORKING_DAYS_YEAR = 260.892
export const GST_RATE = 0.1

/**
 * Cost recovery policy. Placeholder figures — the workbook's own rates are
 * treated as proprietary, so `basis` stands in for full recovery and the range
 * is what a project may be priced within. All of it is meant to be replaced
 * once the real numbers are confirmed; nothing else hard-codes a multiplier.
 */
export const RECOVERY = {
  /** Full cost recovery — what the project costs the University. */
  basis: 1.7,
  min: 1,
  max: 2.5,
  step: 0.01,
}

/** Pricing below what the project costs is what escalates to the Dean. */
export const minRecoveryFor = (_startYear: number) => RECOVERY.basis

export const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"]

export const EMPLOYMENT_TYPES = ["Continuing", "Fixed-Term", "Casual"]
export const CATEGORIES = ["Academic", "Professional"]
export const BASES = ["FTE", "Daily", "Hourly"]

/** dFortTime / dCasTime — casual staff are paid hourly, salaried staff are not. */
export const basesFor = (employment: string) => {
  if (employment === "Casual") return ["Hourly"]
  if (employment === "Continuing" || employment === "Fixed-Term") return ["FTE", "Daily"]
  return []
}

/** FTE is a fraction of one full-time person; days and hours are counts. */
export const maxTimeFor = (basis: string) => (basis === "FTE" ? 1 : undefined)

export const COST_GROUPS = COST_CATEGORIES

/** The estimated additional 10% is not appropriate for these categories. */
export const NO_TEN_PERCENT = new Set(["Shared Grant Payments", "Student Support"])

export const ACADEMIC_CLASSIFICATIONS = Object.keys(SALARY_RATES)
  .filter((k) => k.startsWith("FortnightAcademic"))
  .map((k) => k.slice("FortnightAcademic".length))

export const PROFESSIONAL_CLASSIFICATIONS = Object.keys(SALARY_RATES)
  .filter((k) => k.startsWith("FortnightProfessional"))
  .map((k) => k.slice("FortnightProfessional".length))

export function classificationsFor(category: string) {
  if (category === "Academic") return ACADEMIC_CLASSIFICATIONS
  if (category === "Professional") return PROFESSIONAL_CLASSIFICATIONS
  return []
}

/* ---------------------------------------------------------------- types */

export interface StaffRow {
  id: string
  name: string
  employment: string
  category: string
  classification: string
  basis: string
  time: number[]
  /** True when the University absorbs this person rather than charging for them. */
  inKind: boolean
  inKindReason: string
}

export interface NonStaffRow {
  id: string
  group: string
  expense: string
  desc: string
  amounts: number[]
  inKind: boolean
  addTenPercent: boolean
  inKindReason: string
}

export interface Project {
  title: string
  ci: string
  funder: string
  otherFunder: string
  otherFunderCategory: string
  scheme: string
  dept: string
  /** Project attributes — Company and Cost Centre follow the department, these two do not. */
  activity: string
  region: string
  notes: string
  researchType: "cat1" | "noncat1" | "contract"
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
  /** The one cost recovery multiplier, set in the top bar and used everywhere. */
  multiplier: number
  noCostRecovery: boolean
  ciCostsIncluded: boolean
  justification: string
  justificationNotes: string
  /** Used when a sponsor's documented rules prohibit full costing, so no Dean sign-off is needed. */
  deanExemptionReason: string
  cashCoContribution: number
  staff: StaffRow[]
  nonStaff: NonStaffRow[]
}

/* ------------------------------------------------------------ calculation */

const payrollType = (employment: string) => (employment === "Casual" ? "Casual" : "Fortnight")
const family = (cls: string) => (cls.startsWith("UOM 10") ? "UOM 10" : cls.replace(/\.\d+$/, ""))
const stepOf = (cls: string) => parseInt(cls.split(".")[1] || "1", 10)

/** Steps advance once per prior year actually worked, capped at the top step. */
export function classificationForYear(cls: string, employment: string, yearsWorkedBefore: number) {
  if (!cls || employment === "Casual") return cls
  const fam = family(cls)
  if (fam === "UOM 10") return "UOM 10"
  return `${fam}.${Math.min(stepOf(cls) + yearsWorkedBefore, SALARY_MAX_STEP[fam] ?? 1)}`
}

/**
 * The rate as shown in the table: the annual figure scaled to the chosen basis,
 * so Daily is the annual rate over 220 working days rather than the annual rate.
 */
export function tableRate(row: StaffRow) {
  if (!row.classification || !row.category || !row.employment || !row.basis) return 0
  const annual = SALARY_RATES[payrollType(row.employment) + row.category + row.classification] ?? 0
  return annual * (RATE_BASIS[row.basis] ?? 1)
}

function baseRate(row: StaffRow, year: number, yearsWorkedBefore: number) {
  if (!row.classification || !row.category || !row.employment) return 0
  const cls = classificationForYear(row.classification, row.employment, yearsWorkedBefore)
  const raw = SALARY_RATES[payrollType(row.employment) + row.category + cls] ?? 0
  return raw * (RATE_BASIS[row.basis] ?? 1) * ebaMultiplier(year)
}

/** Portion of the year the project runs for. Applied to FTE lines only. */
export function yearFraction(index: number, count: number, startMonth: number, endMonth: number) {
  if (count === 1) return Math.max(0, endMonth - startMonth + 1) / 12
  if (index === 0) return (12 - startMonth + 1) / 12
  if (index === count - 1) return endMonth / 12
  return 1
}

export interface OnCostBlock {
  rate: number
  salary: number
  leaveLoading: number
  superannuation: number
  subTotal1: number
  payrollTax: number
  workcover: number
  longServiceLeave: number
  parentalLeave: number
  subTotal2: number
  annualLeaveProvision: number
  salaryPlusOncosts: number
}

function onCostBlock(row: StaffRow, time: number, year: number, worked: number, fraction: number): OnCostBlock {
  const emp = row.employment
  const rate = baseRate(row, year, worked)
  const salary = row.basis === "FTE" ? time * rate * fraction : time * rate
  const leaveLoading = Math.min(salary * (ONCOSTS.leaveLoading[emp] ?? 0), MAX_LEAVE_LOADING)
  const superannuation = salary * (ONCOSTS.superannuation[emp] ?? 0)
  const subTotal1 = salary + leaveLoading + superannuation
  const payrollTax = subTotal1 * ONCOSTS.payrollTax
  const workcover = subTotal1 * (ONCOSTS.workcover[emp] ?? 0)
  const longServiceLeave = salary * (ONCOSTS.longServiceLeave[emp] ?? 0)
  const parentalLeave = salary * (ONCOSTS.parentalLeave[emp] ?? 0)
  const subTotal2 = subTotal1 + payrollTax + workcover + longServiceLeave + parentalLeave
  const annualLeaveProvision = salary * (ONCOSTS.annualLeaveProvision[emp] ?? 0)
  return {
    rate, salary, leaveLoading, superannuation, subTotal1, payrollTax, workcover,
    longServiceLeave, parentalLeave, subTotal2, annualLeaveProvision,
    salaryPlusOncosts: subTotal2 + annualLeaveProvision,
  }
}

export interface StaffYear extends OnCostBlock {
  year: number
  time: number
  classification: string
  total: number
  fullCost: number
}

export interface StaffLine {
  byYear: StaffYear[]
  total: number
  fullCost: number
  directSalary: number
  salaryPlusOncosts: number
}

/** The tool prices work still to be done, so a project cannot start in the past. */
export function earliestStart() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/**
 * Pulls a duration back into shape after any one of its four fields changes:
 * no start before this month, and no end before the start.
 */
export function normaliseDuration({
  startYear, startMonth, endYear, endMonth,
}: Pick<Project, "startYear" | "startMonth" | "endYear" | "endMonth">) {
  const floor = earliestStart()
  if (startYear < floor.year) {
    startYear = floor.year
    startMonth = floor.month
  } else if (startYear === floor.year && startMonth < floor.month) {
    startMonth = floor.month
  }
  // An end date that has not been chosen yet is left alone.
  if (endYear > 0 && endYear < startYear) {
    endYear = startYear
    endMonth = startMonth
  } else if (endYear === startYear && endMonth > 0 && endMonth < startMonth) {
    endMonth = startMonth
  }
  return { startYear, startMonth, endYear, endMonth }
}

/** Zero means the end date has not been chosen yet, so there is nothing to cost. */
export const hasEndDate = (p: Pick<Project, "endYear" | "endMonth">) =>
  p.endYear > 0 && p.endMonth > 0

/** One column per calendar year the project runs in — however many that is. */
export function projectYears(p: Project) {
  if (!hasEndDate(p)) return [p.startYear]
  const count = Math.max(1, p.endYear - p.startYear + 1)
  return Array.from({ length: count }, (_, i) => p.startYear + i)
}

export function staffLine(row: StaffRow, p: Project, multiplier: number): StaffLine {
  const years = projectYears(p)
  let worked = 0
  const byYear = years.map((year, i) => {
    const time = row.time[i] ?? 0
    const before = worked
    const block = onCostBlock(row, time, year, before, yearFraction(i, years.length, p.startMonth, p.endMonth))
    if (time > 0) worked++
    return {
      year, time, ...block,
      classification: classificationForYear(row.classification, row.employment, before),
      total: multiplier * block.salaryPlusOncosts,
      fullCost: RECOVERY.basis * block.salaryPlusOncosts,
    }
  })
  const sum = (k: keyof StaffYear) => byYear.reduce((s, y) => s + (y[k] as number), 0)
  return {
    byYear,
    total: sum("total"),
    fullCost: sum("fullCost"),
    directSalary: sum("salary"),
    salaryPlusOncosts: sum("salaryPlusOncosts"),
  }
}

export interface NonStaffLine {
  direct: number
  tenPercent: number
  total: number
}

export function nonStaffLine(row: NonStaffRow): NonStaffLine {
  const direct = row.amounts.reduce((s, v) => s + (v || 0), 0)
  const tenPercent = row.addTenPercent && !NO_TEN_PERCENT.has(row.group) ? direct * 0.1 : 0
  return { direct, tenPercent, total: direct + tenPercent }
}

export interface Summary {
  years: number[]
  multiplier: number
  inKindMultiplier: number
  staffPrice: number
  staffFull: number
  inKindStaffPrice: number
  inKindStaffFull: number
  nonStaff: number
  nonStaffDirect: number
  nonStaffTenPercent: number
  inKindNonStaff: number
  inKindNonStaffDirect: number
  directSalary: number
  oncosts: number
  projectCost: number
  projectCostFull: number
  inKindTotal: number
  inKindTotalFull: number
  totalCost: number
  totalCostFull: number
  price: number
  gstApplies: boolean
  gst: number
  cashBenefit: number
  universityPosition: number
  triggers: string[]
  cat1Exempt: boolean
  deanRequired: boolean
  staffByBucket: Record<string, number>
  nonStaffByGroup: Record<string, number>
  /** The minimum cost recovery multiplier for this project's start year. */
  minRecovery: number
}

const bucketKeys = [
  "Academic Continuing", "Academic Fixed-Term", "Professional Continuing",
  "Professional Fixed-Term", "Academic Casual", "Professional Casual",
]

export function summarise(p: Project): Summary {
  const years = projectYears(p)
  const multiplier = p.noCostRecovery ? 1 : p.multiplier || 0
  // In-kind is valued at what it costs the University, not at the negotiated
  // price, so it stays put when the multiplier is moved.
  const inKindMultiplier = RECOVERY.basis

  const chargedStaff = p.staff.filter((r) => !r.inKind)
  const absorbedStaff = p.staff.filter((r) => r.inKind)
  const direct = chargedStaff.map((r) => staffLine(r, p, multiplier))
  const directFull = chargedStaff.map((r) => staffLine(r, p, RECOVERY.basis))
  const inKind = absorbedStaff.map((r) => staffLine(r, p, inKindMultiplier))
  const inKindFull = absorbedStaff.map((r) => staffLine(r, p, RECOVERY.basis))
  const add = (lines: StaffLine[], k: keyof StaffLine) =>
    lines.reduce((s, x) => s + (x[k] as number), 0)

  const staffPrice = add(direct, "total")
  const staffFull = add(directFull, "fullCost")
  const inKindStaffPrice = add(inKind, "total")
  const inKindStaffFull = add(inKindFull, "fullCost")

  const charged = p.nonStaff.filter((r) => !r.inKind).map(nonStaffLine)
  const absorbed = p.nonStaff.filter((r) => r.inKind).map(nonStaffLine)
  const nonStaff = charged.reduce((s, x) => s + x.total, 0)
  const inKindNonStaff = absorbed.reduce((s, x) => s + x.total, 0)

  const directSalary = add(direct, "directSalary") + add(inKind, "directSalary")
  const salaryPlusOncosts = add(direct, "salaryPlusOncosts") + add(inKind, "salaryPlusOncosts")

  const projectCost = staffPrice + nonStaff
  const projectCostFull = staffFull + nonStaff
  const inKindTotal = inKindStaffPrice + inKindNonStaff
  const inKindTotalFull = inKindStaffFull + inKindNonStaff

  const price = projectCost
  const gstApplies = p.researchType === "contract"
  const gst = gstApplies ? price * GST_RATE : 0

  // Price is measured against the cost at full recovery, not at the chosen multiplier.
  const cashBenefit = price - projectCostFull
  const universityPosition = cashBenefit - inKindTotalFull - (p.cashCoContribution || 0)

  const triggers: string[] = []
  const minRecovery = minRecoveryFor(p.startYear)
  if (multiplier < minRecovery)
    triggers.push(
      `the multiplier (${multiplier.toFixed(2)}) is below full cost recovery (${minRecovery.toFixed(2)})`,
    )
  if (inKindTotal > 0) triggers.push("the project includes in-kind contributions")
  if (universityPosition < 0) triggers.push("the project is priced below break-even")
  const cat1Exempt = p.researchType === "cat1"

  const staffByBucket = Object.fromEntries(bucketKeys.map((k) => [k, 0]))
  chargedStaff.forEach((r, i) => {
    if (!r.category || !r.employment) return
    const key = r.employment === "Casual" ? `${r.category} Casual` : `${r.category} ${r.employment}`
    if (key in staffByBucket) staffByBucket[key] += direct[i].salaryPlusOncosts
  })

  const nonStaffByGroup = Object.fromEntries(COST_GROUPS.map((g) => [g, 0]))
  p.nonStaff.filter((r) => !r.inKind).forEach((r) => {
    if (r.group) nonStaffByGroup[r.group] += nonStaffLine(r).total
  })

  return {
    years, multiplier, inKindMultiplier,
    staffPrice, staffFull, inKindStaffPrice, inKindStaffFull,
    nonStaff,
    nonStaffDirect: charged.reduce((s, x) => s + x.direct, 0),
    nonStaffTenPercent: charged.reduce((s, x) => s + x.tenPercent, 0),
    inKindNonStaff,
    inKindNonStaffDirect: absorbed.reduce((s, x) => s + x.direct, 0),
    directSalary,
    oncosts: salaryPlusOncosts - directSalary,
    projectCost, projectCostFull, inKindTotal, inKindTotalFull,
    totalCost: projectCost + inKindTotal,
    totalCostFull: projectCostFull + inKindTotalFull,
    price, gstApplies, gst, cashBenefit, universityPosition,
    triggers, cat1Exempt, minRecovery,
    deanRequired: triggers.length > 0 && !cat1Exempt,
    staffByBucket, nonStaffByGroup,
  }
}

/* -------------------------------------------------------------- factories */

let seq = 0
const nextId = () => `r${++seq}`

// Per-year values start empty and are filled to the project's length as they
// are entered, so the number of year columns is never baked into a row.
export const blankStaffRow = (inKind = false): StaffRow => ({
  id: nextId(), name: "", employment: "", category: "", classification: "", basis: "",
  time: [], inKind, inKindReason: "",
})

export const blankNonStaffRow = (): NonStaffRow => ({
  id: nextId(), group: "", expense: "", desc: "", amounts: [],
  inKind: false, addTenPercent: false, inKindReason: "",
})

/** Replaces one year's value, keeping the list dense and exactly `count` long. */
export const setYearValue = (values: number[], index: number, value: number, count: number) =>
  Array.from({ length: count }, (_, i) => (i === index ? value : (values[i] ?? 0)))

export const emptyProject = (staffRows: number, nonStaffRows: number): Project => ({
  title: "", ci: "", funder: "Other", otherFunder: "", otherFunderCategory: "",
  scheme: "", dept: "",
  activity: "Research", region: "Parkville", notes: "",
  researchType: "contract",
  // Starts this month; the end date has to be chosen before anything can be costed.
  startYear: earliestStart().year,
  startMonth: earliestStart().month,
  endYear: 0,
  endMonth: 0,
  multiplier: RECOVERY.basis,
  noCostRecovery: false, ciCostsIncluded: true,
  justification: "", justificationNotes: "", deanExemptionReason: "", cashCoContribution: 0,
  staff: Array.from({ length: staffRows }, () => blankStaffRow()),
  nonStaff: Array.from({ length: nonStaffRows }, blankNonStaffRow),
})
