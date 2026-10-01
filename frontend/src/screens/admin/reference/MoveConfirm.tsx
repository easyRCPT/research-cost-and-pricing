import { useAdminProjects } from '@/api/admin-console'
import { InlineConfirm } from '@/components/ui/inline-confirm'

/**
 * Moving a department moves its costings waiting on a dean to the new
 * faculty's dean: the dean queue reads the department's faculty when it is
 * asked, not at submission (#70). So the move says how many first.
 */
export function MoveConfirm({
  department,
  to,
  pending,
  onConfirm,
  onCancel,
}: {
  department: string
  to: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { data: projects, isPending } = useAdminProjects()
  const waiting = (projects ?? []).filter(
    (project) =>
      project.department_code === department &&
      project.status === 'dean_review',
  ).length

  return (
    <div role="alert" className="grid gap-2 text-[12.5px]">
      <span className="font-medium">
        Move {department} to {to}?
      </span>
      <span>
        {isPending
          ? 'Counting the costings waiting on a dean…'
          : waiting === 0
            ? 'No costing from this department is waiting on a dean.'
            : `${waiting} ${waiting === 1 ? 'costing' : 'costings'} waiting on a dean will go to the dean of ${to} instead.`}
      </span>
      <InlineConfirm
        confirm="Move"
        pendingLabel="Moving…"
        cancel="Back"
        disabled={isPending}
        pending={pending}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </div>
  )
}
