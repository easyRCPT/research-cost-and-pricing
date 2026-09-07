import { type SidebarSection } from '.'

export const SECTIONS = [
  { items: [{ id: 'details', label: 'Project Details' }] },
  {
    label: 'Costing',
    items: [
      { id: 'staff', label: 'Staff Costs' },
      { id: 'nonstaff', label: 'Non-Staff Costs' },
    ],
  },
  {
    label: 'Pricing',
    items: [
      { id: 'inkind', label: 'In-Kind Contributions' },
      { id: 'price', label: 'Price Summary' },
    ],
  },
  {
    label: 'Authorisation',
    items: [
      { id: 'budget', label: 'Budget Form' },
      { id: 'approvals', label: 'Approvals' },
    ],
  },
] satisfies readonly SidebarSection[]
