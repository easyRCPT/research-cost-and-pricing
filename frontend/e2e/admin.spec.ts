import { test, expect, createProject, csrfToken, DEMO, makeReady, uniqueTitle } from './fixtures'
import type { Page } from '@playwright/test'

/** The admin door, by API, as signIn does for the others. */
async function signInAsAdmin(page: Page) {
  await page.context().clearCookies()
  await page.request.get('/api/auth/csrf/')
  const response = await page.request.post('/api/auth/admin-login/', {
    headers: { 'X-CSRFToken': await csrfToken(page) },
    data: { email: DEMO.admin, password: DEMO.password },
  })
  expect(response.status(), await response.text()).toBe(200)
}

test("the register finds anyone's costing, read-only, and the log has its submission (#71, #72)", async ({
  page,
}) => {
  // A researcher's costing, submitted: nothing the admin made.
  const title = uniqueTitle('Register')
  const project = await createProject(page, title, { start: 2026, end: 2026 }, DEMO.hodDepartment)
  await makeReady(page, project.budget_id)
  const submitted = await page.request.post(`/api/budgets/${project.budget_id}/submit/`, {
    headers: { 'X-CSRFToken': await csrfToken(page) },
  })
  expect(submitted.status(), await submitted.text()).toBe(200)

  await signInAsAdmin(page)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible()
  await expect(page.getByText('Projects by status')).toBeVisible()

  const rail = page.getByRole('navigation', { name: 'Admin sections' })
  await rail.getByRole('button', { name: 'Project register' }).click()
  await page.getByPlaceholder('Search').fill(title)
  const row = page.getByRole('row').filter({ hasText: title })
  await expect(row).toContainText(DEMO.researcher)
  await expect(row).toContainText('Head of Department review')

  await row.getByRole('button', { name: title }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/details`)
  await expect(page.getByText('This costing is with the Head of Department, so it is read-only.')).toBeVisible()
  await page.locator('header').getByRole('button', { name: 'Project register' }).click()
  await expect(page).toHaveURL('/admin/projects')

  // The submission is in the log, found through a filter built from the log.
  await rail.getByRole('button', { name: 'Audit log' }).click()
  await page.getByRole('combobox', { name: 'Action' }).click()
  await page.getByRole('option', { name: 'budget.submit' }).click()
  await expect(
    page.getByRole('row').filter({ hasText: `budget #${project.budget_id}` }),
  ).toContainText(DEMO.researcher)
})
