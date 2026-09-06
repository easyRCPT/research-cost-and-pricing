import type { components } from './api'

type S = components['schemas']

// Response types
export type BudgetDetail = S['BudgetDetail']
export type ProjectInfo = S['ProjectInfo']
export type StaffLine = S['StaffLine']
export type NonStaffLine = S['NonStaffLine']
export type StaffCost = S['StaffCost']
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
export type Status = S['StatusEnum']

// Lookups
export type LookupTables = S['LookupTables']
export type LookupTableNames = keyof LookupTables
