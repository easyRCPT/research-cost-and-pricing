import { Link } from '@tanstack/react-router'

import { useOverview } from '@/api/admin-console'
import { PageHead, Panel } from '@/components/shell'
import { AuditTable } from '@/screens/admin/audit/AuditTable'
import { Block } from '@/screens/admin/overview/Block'
import { Counts } from '@/screens/admin/overview/Counts'
import { LINK } from '@/screens/admin/overview/links'
import { Stat } from '@/screens/admin/overview/Stat'
import { Stranded } from '@/screens/admin/overview/Stranded'
import { VersionsSummary } from '@/screens/admin/overview/VersionsSummary'

/**
 * The console's front door (#94), from one request. Every count is made in the
 * database; nothing here fetches a list to take its length.
 */
export function Overview() {
  const { data, isPending } = useOverview()
  const accounts = data?.accounts
  const projects = data?.projects
  const versions = data?.versions
  const drafts =
    projects?.by_status.find((row) => row.status === 'draft')?.count ?? 0
  const current = versions?.latest.find((version) => version.current)

  return (
    <>
      <PageHead
        title="Administration"
        subtitle="Accounts, approvers, versioned rates and the audit trail"
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Accounts"
          value={accounts?.total}
          note={
            accounts &&
            (accounts.inactive
              ? `${accounts.inactive} deactivated`
              : 'All active')
          }
        />
        <Stat
          label="Projects"
          value={projects?.total}
          note={projects && `${drafts} still in draft`}
        />
        <Stat
          label="Rate versions"
          value={versions?.total}
          note={current && `#${current.id} is current`}
        />
        <Stat
          label="Faculties"
          value={projects?.faculties}
          note="With at least one project"
        />
      </div>

      <Stranded />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Accounts by group">
          {isPending ? (
            <Block />
          ) : (
            <Counts
              rows={[
                ...(accounts?.by_group.map((row) => ({
                  label: row.group,
                  count: row.count,
                })) ?? []),
                {
                  label: 'Users with no group',
                  count: accounts?.no_group ?? 0,
                  total: true,
                },
              ]}
            />
          )}
          <p className="mt-3 text-[12.5px]">
            <Link to="/admin/users" className={LINK}>
              Manage accounts
            </Link>
          </p>
        </Panel>
        <Panel
          title="Projects by status"
          description="Each project counted once, by its latest budget."
        >
          {isPending ? (
            <Block />
          ) : (
            // One row per Budget.Status, labelled by the server from the model.
            <Counts
              rows={
                projects?.by_status.map((row) => ({
                  label: row.label,
                  count: row.count,
                })) ?? []
              }
            />
          )}
          <p className="mt-3 text-[12.5px]">
            <Link to="/admin/projects" className={LINK}>
              Open the project register
            </Link>
          </p>
        </Panel>
      </div>

      <VersionsSummary versions={versions} loading={isPending} />

      <Panel
        title="Recent activity"
        description="The last eight entries in the audit log."
      >
        <AuditTable
          entries={data?.recent}
          loading={isPending}
          empty="Nothing has been recorded yet."
        />
        <p className="mt-3 text-[12.5px]">
          <Link to="/admin/audit" className={LINK}>
            Open the full audit log
          </Link>
        </p>
      </Panel>
    </>
  )
}
