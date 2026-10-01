import type { Page } from '@playwright/test'

import { apiWrite, createProject, expect, signIn, test, uniqueTitle } from './fixtures'

/**
 * The reference tables (#70, #144): saved a row at a time, in place, with no
 * rates version. Every row here has a code of this run's own, so nothing
 * another spec reads is touched.
 */

const unique = () => `E2E${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`

async function openTab(page: Page, tab: string) {
  await page.goto('/admin/lookups')
  await page.getByRole('tablist', { name: 'Reference tables' }).getByRole('tab', { name: tab }).click()
  await expect(page.getByRole('heading', { name: tab, exact: true })).toBeVisible()
  await expect(page.getByText("It doesn't price a costing, so no rates version is made.")).toBeVisible()
}

async function addRow(page: Page, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value)
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await signIn(page, 'admin')
})

test('a faculty is added and renamed, and its code never changes (#70)', async ({ page }) => {
  const code = unique()
  await openTab(page, 'Faculties')
  await addRow(page, { Code: code, Name: 'Faculty of Testing' })
  const row = page.getByRole('row').filter({ hasText: code })
  await expect(row).toContainText('Faculty of Testing')

  await row.getByRole('button', { name: `Edit ${code}` }).click()
  // The code is shown, never offered for editing.
  await expect(row.getByRole('textbox', { name: `Code for ${code}` })).toHaveCount(0)
  await row.getByRole('textbox', { name: `Name for ${code}` }).fill('Faculty of Trying')
  await expect(row).toContainText('Costings already approved will show the new name')
  await row.getByRole('button', { name: 'Save' }).click()
  await expect(row).toContainText('Faculty of Trying')
  await expect(row.getByRole('button', { name: `Edit ${code}` })).toBeVisible()

  // And there is nothing to remove a faculty with.
  await expect(row.getByRole('button', { name: `Remove ${code}` })).toHaveCount(0)
})

test('a duplicate code is refused on the code field (#70)', async ({ page }) => {
  const code = unique()
  await openTab(page, 'Faculties')
  await addRow(page, { Code: code, Name: 'First' })
  await expect(page.getByRole('row').filter({ hasText: code })).toBeVisible()

  await addRow(page, { Code: code, Name: 'Second' })

  const field = page.getByLabel('Code', { exact: true })
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText(/already exists/)).toBeVisible()
})

test('a department is added under a faculty and moved, asking first (#70)', async ({ page }) => {
  const from = unique()
  const to = unique()
  const department = unique()
  await openTab(page, 'Faculties')
  await addRow(page, { Code: from, Name: `From ${from}` })
  await expect(page.getByRole('row').filter({ hasText: from })).toBeVisible()
  await addRow(page, { Code: to, Name: `To ${to}` })
  await expect(page.getByRole('row').filter({ hasText: to })).toBeVisible()

  await page.getByRole('tablist', { name: 'Reference tables' }).getByRole('tab', { name: 'Departments' }).click()
  await page.getByLabel('Code', { exact: true }).fill(department)
  await page.getByLabel('Name', { exact: true }).fill('Department of Testing')
  await page.getByLabel('School', { exact: true }).fill('School of Testing')
  await page.getByLabel('School code', { exact: true }).fill('SCH')
  await page.getByLabel('Faculty', { exact: true }).click()
  await page.getByRole('option', { name: `From ${from}` }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: department })
  await expect(row).toContainText(`From ${from}`)

  await row.getByRole('button', { name: `Edit ${department}` }).click()
  await row.getByRole('combobox', { name: `Faculty for ${department}` }).click()
  await page.getByRole('option', { name: `To ${to}` }).click()
  await row.getByRole('button', { name: 'Save' }).click()

  const ask = row.getByRole('alert')
  await expect(ask).toContainText(`Move ${department} to To ${to}?`)
  await expect(ask).toContainText('No costing from this department is waiting on a dean.')
  await ask.getByRole('button', { name: 'Move' }).click()
  await expect(row).toContainText(`To ${to}`)
})

test('an unused activity can be removed, and the log has every write (#144)', async ({ page }) => {
  const code = unique().slice(0, 10)
  await openTab(page, 'Activities')
  await addRow(page, { Code: code, Name: 'Testing' })
  const row = page.getByRole('row').filter({ hasText: code })
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: `Remove ${code}` }).click()
  await row.getByRole('alert').getByRole('button', { name: 'Remove' }).click()
  await expect(row).toHaveCount(0)

  const log = await (await page.request.get('/api/admin/audit/?action=admin.lookup.delete&limit=20')).json()
  expect(log.some((entry: { object_id: string }) => entry.object_id === code)).toBe(true)
})

test('a region a project uses is refused, saying what uses it (#144)', async ({ page }) => {
  const code = unique().slice(0, 10)
  await openTab(page, 'Regions')
  await addRow(page, { Code: code, Name: 'Testing' })
  const row = page.getByRole('row').filter({ hasText: code })
  await expect(row).toBeVisible()

  // A researcher's project in that region.
  await signIn(page)
  const project = await createProject(page, uniqueTitle('Region'))
  await apiWrite(page, 'patch', `/api/budgets/${project.budget_id}/`, {
    data: { section: 'project', field: 'region', value: code },
  })

  await signIn(page, 'admin')
  await openTab(page, 'Regions')
  await row.getByRole('button', { name: `Remove ${code}` }).click()
  await row.getByRole('alert').getByRole('button', { name: 'Remove' }).click()
  await expect(row).toContainText("1 project uses this region, so it can't be removed.")
})
