import type { components } from './api'

type S = components['schemas']

// Lookups
export type LookupTables = S['LookupTables']
export type LookupTableNames = keyof LookupTables
export type NonStaffCategory = S['NonStaffCostCategory']
export type Department = S['Department']
export type SalaryRate = S['SalaryRate']
export type SalaryRateMultiplier = S['SalaryRateMultiplier']

// Projects
export type ProjectRow = S['ProjectRow']
export type ProjectCreate = S['ProjectCreate']

// Project Details
export type ProjectInfo = S['ProjectInfo']
export type BudgetInfo = S['BudgetInfo']
export type Activity = S['Activity']
export type Region = S['Region']
export type Currency = S['Currency']

// Response types
export type BudgetDetail = S['BudgetDetail']
export type ApprovalRecord = S['ApprovalRecord']
export type ApprovalStepRecord = S['ApprovalStepRecord']
export type StaffLine = S['StaffLine']
export type NonStaffLine = S['NonStaffLine']
export type StaffCost = S['StaffCost']
export type StaffTotal = S['StaffTotal']
export type NonStaffCost = S['NonStaffCost']
export type NonStaffTotal = S['NonStaffTotal']
export type Deliverable = S['DeliverableResult']
export type PriceSummary = S['PriceSummary']
export type StaffBudget = S['StaffBudget']
export type NonStaffBudget = S['NonStaffBudget']

// Temporary types for staff
export type EditableStaffLine = Omit<
  StaffLine,
  'employment_type' | 'category' | 'time_basis'
> & {
  employment_type: EmploymentType | ''
  category: StaffCategory | ''
  time_basis: TimeBasis | ''
}

export type RatedStaffLine = Omit<
  EditableStaffLine,
  'employment_type' | 'category' | 'time_basis'
> & {
  employment_type: EmploymentType
  category: StaffCategory
  time_basis: TimeBasis
}

// Input types
export type StaffLineInput = S['StaffLineInput']
export type NonStaffLineInput = S['NonStaffLineInput']
export type DeliverableInput = S['Deliverable']
export type BudgetUpdate = S['BudgetUpdate']
export type Section = BudgetUpdate['section']

// Choices
export type EmploymentType = S['EmploymentTypeEnum']
export type StaffCategory = S['IncrementCap']['category']
export type TimeBasis = S['TimeBasisEnum']

/** model.py enums  */
export type Status = S['StatusEnum']

/**
 * What an edit may set. The same shapes the response carries: a screen binds
 * an input to a field it read, and sends that field back.
 */
export type ProjectInfoInput = ProjectInfo
export type BudgetInfoInput = BudgetInfo

export type CalculationConstant = S['CalculationConstant']
