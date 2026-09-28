import { type SidebarSection } from '.'

export const SECTIONS = [
  { items: [{ id: 'details', label: 'Project Details' }] },
  {
    label: 'Costing',
    items: [
      { id: 'staff', label: 'Staff Costs' },
      { id: 'nonstaff', label: 'Non-Staff Costs' },
      { id: 'cash', label: 'Cash Co-Contributions' },
    ],
  },
  {
    label: 'Pricing',
    items: [
      { id: 'adjust', label: 'Adjust Price' },
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
