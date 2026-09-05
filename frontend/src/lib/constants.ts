import type { ProjectInfo } from '@/types'

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1

export const EMPTY_PROJECT: ProjectInfo = {
  title: '',
  chief_investigator: '',
  funder: '',
  department: '',
  faculty: '',
  scheme: '',
  start_year: year,
  start_month: month,
  end_year: year,
  end_month: month,
  company: 'C001',
  cost_centre: '',
  activity: null,
  region: null,
  additional_information: '',
}
