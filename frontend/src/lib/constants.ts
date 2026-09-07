import type { ProjectInfo } from '@/types'

export const STARTING_ROWS = 6

export const EXTERNAL_PARTIES = ['NHMRC', 'ARC', 'Other'] as const

export const OTHER_FUNDER_CATEGORIES = [
  'State and Local Government Grants',
  'Contributions from Other Higher Education Providers',
  'Overseas Government Grants',
  'Non-Government Grants',
  'Consultancies and Contracts',
] as const

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
  other_funder: '',
  other_funder_category: '',
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
