import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useApproverGaps, useOverview } from '@/api/admin-console'
import { Grid, PageHead, Panel, Td, Th } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { shortDate } from '@/lib/format/dates'
import { AuditTable } from './Audit'

const LINK = 'font-medium text-primary underline-offset-4 hover:underline'

/**
 * The console's front door (#94), from one request. Every count is made in the
 * database; nothing here fetches a list to take its length.
 */
export function Overview() {
  const { data, isPending } = useOverview()
  const accounts = data?.accounts
  const projects = data?.projects
  const versions = data?.versions
  const drafts = projects?.by_status.find((row) => row.status === 'draft')?.count ?? 0
  const current = versions?.latest.find((version) => version.current)

  return (
    <>
      <PageHead
        title="Administration"
        subtitle="Accounts, approvers, versioned rates and the audit trail"
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Accounts" value={accounts?.total}
          note={accounts && (accounts.inactive ? `${accounts.inactive} deactivated` : 'All active')} />
        <Stat label="Projects" value={projects?.total} note={projects && `${drafts} still in draft`} />
        <Stat label="Rate versions" value={versions?.total}
          note={current && `#${current.id} is current`} />
        <Stat label="Faculties" value={projects?.faculties} note="With at least one project" />
      </div>

      <Stranded />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Accounts by group">
          {isPending ? <Block /> : (
            <Counts
              rows={[
                ...(accounts?.by_group.map((row) => ({ label: row.group, count: row.count })) ?? []),
                { label: 'Users with no group', count: accounts?.no_group ?? 0, total: true },
              ]}
            />
          )}
          <p className="mt-3 text-[12.5px]"><Link to="/admin/users" className={LINK}>Manage accounts</Link></p>
        </Panel>
        <Panel title="Projects by status" description="Each project counted once, by its latest budget.">
          {isPending ? <Block /> : (
            // One row per Budget.Status, labelled by the server from the model.
            <Counts rows={projects?.by_status.map((row) => ({ label: row.label, count: row.count })) ?? []} />
          )}
          <p className="mt-3 text-[12.5px]"><Link to="/admin/projects" className={LINK}>Open the project register</Link></p>
        </Panel>
      </div>

      <Panel
        title="Lookup versions"
        description="Each version is a whole set of rates. A submitted costing keeps the version it was priced on."
        className="mb-4"
      >
        {isPending ? <Block /> : (
          <Grid>
            <thead>
              <tr>
                <Th>Version</Th>
                <Th>Made</Th>
                <Th>By</Th>
                <Th align="right">Costings priced on it</Th>
              </tr>
            </thead>
            <tbody>
              {versions?.latest.map((version) => (
                <tr key={version.id}>
                  <Td>#{version.id} {version.current && <Badge variant="secondary">Current</Badge>}</Td>
                  <Td>{shortDate(version.created_at)}</Td>
                  <Td>{version.updated_by ?? '—'}</Td>
                  <Td align="right" className="tabular">{version.budgets_priced}</Td>
                </tr>
              ))}
            </tbody>
          </Grid>
        )}
        <p className="mt-3 text-[12.5px]">
          <Link to="/admin/lookups" className={LINK}>
            {versions && versions.total > versions.latest.length
              ? `All ${versions.total} versions, and the rates themselves`
              : 'Edit rates, or restore an older version'}
          </Link>
        </p>
      </Panel>

      <Panel title="Recent activity" description="The last eight entries in the audit log.">
        <AuditTable entries={data?.recent} loading={isPending} empty="Nothing has been recorded yet." />
        <p className="mt-3 text-[12.5px]"><Link to="/admin/audit" className={LINK}>Open the full audit log</Link></p>
      </Panel>
    </>
  )
}

/**
 * Costings waiting on a role nobody holds (#121). Routing is strict, so they
 * reach no queue; this is where they are seen, by the people who can assign
 * someone. Shown only when there are any.
 */
function Stranded() {
  const { data } = useApproverGaps()
  const rows = data?.stranded ?? []
  if (rows.length === 0) return null

  return (
    <Panel
      title={`${rows.length} ${rows.length === 1 ? 'costing is' : 'costings are'} waiting on nobody`}
      description="Each is waiting on a role nobody holds, so it reaches no approver's queue. Assigning someone sends it to them with nothing else to do."
      className="mb-4 border-destructive/40"
    >
      <Grid>
        <thead>
          <tr>
            <Th>Costing</Th>
            <Th>Waiting on</Th>
            <Th>Owner</Th>
            <Th align="right">Submitted</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.budget_id}>
              <Td>
                <Link
                  to="/projects/$projectId/$screen"
                  params={{ projectId: row.project_id, screen: 'approvals' }}
                  className={LINK}
                >
                  {row.title || 'Untitled'}
                </Link>
                {row.reference && <span className="ml-2 text-muted-foreground">{row.reference}</span>}
              </Td>
              <Td>
                {row.unit} has no {row.level === 'department' ? 'head of department' : 'dean'}
              </Td>
              <Td>{row.owner}</Td>
              <Td align="right" className="whitespace-nowrap">
                {row.submitted_at ? shortDate(row.submitted_at) : '—'}
              </Td>
            </tr>
          ))}
        </tbody>
      </Grid>
      <p className="mt-3 text-[12.5px]">
        <Link to="/admin/users" className={LINK}>Assign an approver</Link>
      </p>
    </Panel>
  )
}

function Stat({ label, value, note }: { label: string; value: number | undefined; note: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3.5">
      <p className="text-[12px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{label}</p>
      {value === undefined ? (
        <div className="mt-1.5 h-7 w-14 animate-pulse rounded bg-muted" />
      ) : (
        <p className="tabular mt-0.5 text-[26px] leading-tight font-bold text-primary">{value}</p>
      )}
      <p className="mt-0.5 min-h-[18px] text-[12px] text-muted-foreground">{note}</p>
    </div>
  )
}

function Counts({ rows }: { rows: { label: string; count: number; total?: boolean }[] }) {
  return (
    <table className="w-full text-[13.5px]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={row.total ? 'border-t font-semibold' : 'border-b border-border/60 last:border-0'}>
            <td className="py-1.5 pr-3">{row.label}</td>
            <td className="tabular py-1.5 text-right font-semibold">{row.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Block() {
  return <div className="h-40 animate-pulse rounded bg-muted" role="status" aria-label="Loading" />
}
