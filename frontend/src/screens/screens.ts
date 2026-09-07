import type { EditorScreen } from '@/components/shell'

export const SCREEN_HEADINGS: Record<
  EditorScreen,
  { title: string; subtitle: string }
> = {
  details: {
    title: 'Project Details',
    subtitle: 'Part A — project identity, duration and account attributes',
  },
  staff: {
    title: 'Staff Costs',
    subtitle: 'Part B — direct salary and on-costs paid by the project',
  },
  nonstaff: {
    title: 'Non-Staff Costs',
    subtitle: 'Part C — equipment, services, travel and student support',
  },
  inkind: {
    title: 'In-Kind Contributions',
    subtitle:
      'University investment in the project. (Important) Must note that this is not included in the price charged',
  },
  price: {
    title: 'Price Summary',
    subtitle: 'Review the complete costing and pricing position',
  },
  budget: {
    title: 'Budget Form',
    subtitle: 'The costing record prepared for authorisation',
  },
  approvals: {
    title: 'Approvals',
    subtitle: 'Signatures required before the budget form can be submitted',
  },
}
