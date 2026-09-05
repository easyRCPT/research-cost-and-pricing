import type { components } from './api'

type S = components['schemas']

export type BudgetDetail = S['BudgetDetail']
export type ProjectInfo = S['ProjectInfo']
export type StaffLine = S['StaffLine']
export type NonStaffLine = S['NonStaffLine']
export type NonStaffLineInput = S['NonStaffLineInput']
export type EmploymentType = S['EmploymentTypeEnum']
export type TimeBasis = S['TimeBasisEnum']
