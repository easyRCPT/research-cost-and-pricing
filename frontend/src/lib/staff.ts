import type {
  BudgetDetail,
  EditableStaffLine,
  EmploymentType,
  RatedStaffLine,
  SalaryRate,
  SalaryRateMultiplier,
} from '@/types'

export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  'Continuing',
  'Fixed-Term',
  'Casual',
]

export const staffCategories = (rates: readonly SalaryRate[]) => [
  ...new Set(rates.map((rate) => rate.category)),
]

export const classificationsFor = (
  rates: readonly SalaryRate[],
  category: string,
) => [
  ...new Set(
    rates
      .filter((rate) => rate.category === category)
      .map((rate) => rate.classification),
  ),
]

/** Every classification in the table, for sizing before a category is picked. */
export const allClassifications = (rates: readonly SalaryRate[]) => [
  ...new Set(rates.map((rate) => rate.classification)),
]

export const timeBasesFor = (
  multipliers: readonly SalaryRateMultiplier[],
  employmentType: string,
) => {
  const bases = multipliers.map((multiplier) => multiplier.time_basis)
  if (!employmentType) return []
  return employmentType === 'Casual'
    ? bases.filter((basis) => basis === 'Hourly')
    : bases.filter((basis) => basis !== 'Hourly')
}

/** Every basis in the table, for sizing before an employment type is picked. */
export const allTimeBases = (multipliers: readonly SalaryRateMultiplier[]) => [
  ...new Set(multipliers.map((multiplier) => multiplier.time_basis)),
]

/**
 * An FTE row is a fraction of one full-time position.
 *
 * A Daily row stops at 220, which is not a calendar figure: the Salary Rate
 * Multiplier holds 1/220 for Daily, and that is what turns a daily rate into
 * an annual salary, so 220 days is a full year on a Daily row by
 * construction. Hourly has no such number -- its multiplier is 1 because
 * Casual rates are already hourly -- so a full calendar year is as much as it
 * can mean.
 *
 * Kept in step with the backend's TIME_LIMITS, which validates the same caps.
 */
const TIME_LIMITS: Record<string, { label: string; max: number }> = {
  FTE: { label: 'FTE', max: 1 },
  Daily: { label: 'Days', max: 220 },
  Hourly: { label: 'Hours', max: 366 * 24 },
}

export const maxTimeFor = (timeBasis: string) => TIME_LIMITS[timeBasis]?.max

/** Names the time column in messages, before a basis is picked too. */
export const timeLabelFor = (timeBasis: string) =>
  TIME_LIMITS[timeBasis]?.label ?? 'Time'

/** Re-clamps the entered time after a change of basis. */
export const clampedByYear = (line: EditableStaffLine, timeBasis: string) => {
  const max = maxTimeFor(timeBasis)
  if (max === undefined) return line.by_year
  return line.by_year.map((entry) => ({
    ...entry,
    time: Math.min(max, entry.time),
  }))
}

/** The patch for a new time basis, clamping the entered time to its limit. */
export const timeBasisPatch = (
  line: EditableStaffLine,
  timeBasis: string,
): Partial<EditableStaffLine> => ({
  time_basis: timeBasis as EditableStaffLine['time_basis'],
  by_year: clampedByYear(line, timeBasis),
})

/** The patch for a new employment type, moving the time basis if it no longer fits. */
export const employmentTypePatch = (
  line: EditableStaffLine,
  multipliers: readonly SalaryRateMultiplier[],
  employmentType: string,
): Partial<EditableStaffLine> => {
  const employment_type = employmentType as EditableStaffLine['employment_type']
  const allowed = timeBasesFor(multipliers, employment_type)
  if (allowed.includes(line.time_basis)) return { employment_type }
  const time_basis = (allowed[0] ??
    line.time_basis) as EditableStaffLine['time_basis']
  return {
    employment_type,
    time_basis,
    by_year: clampedByYear(line, time_basis),
  }
}

/** The patch for a new category, moving the classification if it no longer fits. */
export const categoryPatch = (
  line: EditableStaffLine,
  rates: readonly SalaryRate[],
  category: string,
): Partial<EditableStaffLine> => {
  const options = classificationsFor(rates, category)
  return {
    category: category as EditableStaffLine['category'],
    ...(options.includes(line.classification)
      ? {}
      : { classification: options[0] ?? line.classification }),
  }
}

export const timeFor = (line: EditableStaffLine, year: number) =>
  line.by_year.find((entry) => entry.year === year)?.time ?? 0

export const costFor = (line: EditableStaffLine, year: number) =>
  line.by_year.find((entry) => entry.year === year)?.cost ?? 0

/**
 * The by_year array with one year's time changed.
 *
 * The costs are copied across unchanged because only the engine can price a
 * new time. Nothing should read them: the optimistic echo takes the time from
 * here and the money from the server's reply. See withEnteredTime.
 */
export const withTime = (
  line: EditableStaffLine,
  years: number[],
  year: number,
  time: number,
) =>
  years.map((y) => ({
    year: y,
    time: y === year ? time : timeFor(line, y),
    cost: costFor(line, y),
  }))

export const emptyStaffLine = (
  id: string,
  years: number[],
): EditableStaffLine => ({
  id,
  // The server appends it on create.
  position: 0,
  name_role: '',
  employment_type: '',
  category: '',
  classification: '',
  time_basis: '',
  in_kind: false,
  in_kind_reason: '',
  is_ci: false,
  rate: 0,
  by_year: years.map((year) => ({ year, time: 0, cost: 0 })),
  total: 0,
})

/** Rows the engine can rate. The name is echoed back, never priced. */
export const isRated = (line: EditableStaffLine): line is RatedStaffLine =>
  line.employment_type !== '' &&
  line.category !== '' &&
  line.classification !== '' &&
  line.time_basis !== ''

/**
 * The CI's own row: the one Include Chief Investigator cost added (#166), wherever it sits in
 * the table. Never read off position, which took over row one whatever it
 * held. None until the project names a CI and the cost is included.
 */
export const ciLineId = (
  lines: EditableStaffLine[],
  chiefInvestigator: string,
) =>
  chiefInvestigator.trim() === ''
    ? null
    : (lines.find((line) => line.is_ci)?.id ?? null)

/**
 * Shows the CI's name, typed on Project Details, on their row, so a renamed
 * CI is never left with the old name.
 */
export const withCiName = (
  lines: EditableStaffLine[],
  chiefInvestigator: string,
) => {
  const id = ciLineId(lines, chiefInvestigator)
  if (id === null) return lines
  const name_role = chiefInvestigator.trim()
  return lines.map((line) => (line.id === id ? { ...line, name_role } : line))
}

/** Rate and cost columns from whichever block priced the row. */
export const withCosts = (lines: EditableStaffLine[], budget: BudgetDetail) => {
  const priced = new Map(
    [...budget.staff_cost.lines, ...budget.staff_in_kind_cost.lines].map(
      (line) => [line.id, line],
    ),
  )

  return lines.map((line) => {
    const cost = priced.get(line.id)
    if (!cost) return line
    return {
      ...line,
      rate: cost.rate,
      total: cost.total,
      by_year: line.by_year.map((entry) => ({
        ...entry,
        cost: costFor(cost, entry.year),
      })),
    }
  })
}
