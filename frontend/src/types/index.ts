import type { components } from './api'

type S = components['schemas']

// Lookups
export type LookupTables = S['LookupTables']
export type LookupTableNames = keyof LookupTables
export type NonStaffCategory = S['NonStaffCostCategory']
export type Department = S['Department']
export type SalaryRate = S['SalaryRate']
export type SalaryRateMultiplier = S['SalaryRateMultiplier']

// Project Details
export type ProjectInfo = S['ProjectInfo']
export type Activity = S['Activity']
export type Region = S['Region']

// Response types
export type BudgetDetail = S['BudgetDetail']
export type StaffLine = S['StaffLine']
export type NonStaffLine = S['NonStaffLine']
export type StaffCost = S['StaffCost']
export type StaffTotal = S['StaffTotal']
export type NonStaffCost = S['NonStaffCost']
export type PriceSummary = S['PriceSummary']
export type StaffBudget = S['StaffBudget']
export type NonStaffBudget = S['NonStaffBudget']

// Input types
export type StaffLineInput = S['StaffLineInput']
export type NonStaffLineInput = S['NonStaffLineInput']
export type DeliverableInput = S['Deliverable']
export type BudgetUpdate = S['BudgetUpdate']
export type Section = BudgetUpdate['section']

// Choices
export type EmploymentType = S['EmploymentTypeEnum']
export type StaffCategory = S['CategoryEnum']
export type TimeBasis = S['TimeBasisEnum']

/** model.py enums  */
export type Mode = S['ModeEnum']

// TODO: temporary. Delete when auth lands.
// Types for the stateless calculator.
export type CalculateRequest = S['CalculateRequest']
export type CalculateStaffLine = S['CalculateStaffLine']
export type CalculateNonStaffLine = S['CalculateNonStaffLine']
export type ProjectInfoInput = S['ProjectInfoInput']
export type BudgetInfoInput = S['BudgetInfoInput']
export type CalculationConstant = S['CalculationConstant']
