import { toast } from 'sonner'

import type { AdminUser, Role } from '@/api/admin-users'
import { ApiError } from '@/lib/api'

export const ROLE_LABEL: Record<Role, string> = {
  hod: 'Head of Department',
  dean: 'Dean',
  member: 'Member',
}

export const refused = (error: unknown) =>
  toast.error('Not saved', {
    description: error instanceof ApiError ? error.message : 'Try again.',
  })

export const nameOf = (user: AdminUser) =>
  `${user.first_name} ${user.last_name}`.trim() || user.email
