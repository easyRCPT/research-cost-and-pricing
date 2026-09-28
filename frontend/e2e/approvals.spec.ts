import {
  test,
  expect,
  createProject,
  csrfToken,
  DEMO,
  signIn,
  uniqueTitle,
} from './fixtures'
import type { Page } from '@playwright/test'

/** Everything submission checks for, filled through the same API the screens use. */
async function makeReady(page: Page, budgetId: number) {
  const headers = { 'X-CSRFToken': await csrfToken(page) }
  for (const [field, value] of [
    ['chief_investigator', 'Dr Ruth Researcher'],
    ['funder', 'Australian Research Council'],
  ]) {
    const response = await page.request.patch(`/api/budgets/${budgetId}/`, {
      headers,
      data: { section: 'project', field, value },
    })
    expect(response.ok(), await response.text()).toBe(true)
  }
  const line = await page.request.post(`/api/budgets/${budgetId}/staff-lines/`, {
    headers,
    data: {
      name_role: 'Dr Chen',
      employment_type: 'Continuing',
      category: 'Academic',
      classification: 'Level A.1',
      time_basis: 'FTE',
      in_kind: false,
      in_kind_reason: '',
      allocations: [{ year: 2026, time: 0.5 }],
    },
  })
  expect(line.status(), await line.text()).toBe(201)
}

async function switchTo(page: Page, email: string, type: 'researcher' | 'staff') {
  await page.context().clearCookies()
  await signIn(page, email, type)
}

test('submitted, approved by the head of department, and recorded (#83, #84)', async ({
  page,
}) => {
  const title = uniqueTitle('Approved end to end')
  const project = await createProject(page, title, { start: 2026, end: 2026 }, DEMO.hodDepartment)
  await makeReady(page, project.budget_id)

  // The owner submits, and the screen shows what the server did.
  await page.goto(`/projects/${project.id}/approvals`)
  await page.getByRole('button', { name: 'Submit for approval' }).click()
  await expect(page.getByText('Awaiting Head of Department')).toBeVisible()
  await expect(page.getByText(/^Waiting on /)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toHaveCount(0)

  // The head of department decides from their queue.
  await switchTo(page, DEMO.hod, 'staff')
  await page.goto('/approvals')
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('No Dean is needed')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm and approve' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'You approved' }),
  ).toContainText('It is approved')
  // Gone from the queue as the confirmation appears, not a moment later.
  await expect(page.getByRole('button', { name: new RegExp(title) })).toHaveCount(0)

  // The owner sees who decided.
  await switchTo(page, DEMO.researcher, 'researcher')
  await page.goto(`/projects/${project.id}/approvals`)
  await expect(page.getByText(/Approved\s+by Hana Head/)).toBeVisible()
})

test('a submitted costing is read-only on every screen', async ({ page }) => {
  const project = await createProject(page, uniqueTitle('Frozen'), { start: 2026, end: 2026 }, DEMO.hodDepartment)
  await makeReady(page, project.budget_id)
  const submitted = await page.request.post(`/api/budgets/${project.budget_id}/submit/`, {
    headers: { 'X-CSRFToken': await csrfToken(page) },
  })
  expect(submitted.status()).toBe(200)

  await page.goto(`/projects/${project.id}/staff`)
  await expect(page.getByText(/so it is read-only/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Add row/ }).first()).toBeDisabled()
})

test('a costing that is not ready lists what the server wants', async ({ page }) => {
  const project = await createProject(page, uniqueTitle('Not ready'))

  await page.goto(`/projects/${project.id}/approvals`)
  await page.getByRole('button', { name: 'Submit for approval' }).click()

  await expect(page.getByText('This costing is not ready to submit yet.')).toBeVisible()
  await expect(page.getByText('Chief investigator is required.')).toBeVisible()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()
})
