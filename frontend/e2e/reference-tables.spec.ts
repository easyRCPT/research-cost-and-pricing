import type { Page } from '@playwright/test'

import { apiWrite, createProject, expect, signIn, test, uniqueTitle } from './fixtures'

/**
 * The reference tables (#70, #144): saved a row at a time, in place, with no
 * rates version. Every row here has a code of this run's own, so nothing
 * another spec reads is touched.
 */

const unique = () => `E2E${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`

/** The costing screen's tab each reference table sits on. */
const TAB_OF: Record<string, string> = {
  Faculties: 'Org Units',
  Departments: 'Org Units',
  Activities: 'Activities & Regions',
  Regions: 'Activities & Regions',
}

async function openTab(page: Page, table: string) {
  await page.goto('/admin/lookups')
  await page.getByRole('tablist', { name: 'Lookup tables' }).getByRole('tab', { name: TAB_OF[table], exact: true }).click()
  await page.getByRole('tab', { name: table, exact: true }).click()
}

/** Fills the table's Add dialog, by field label, and adds the row. */
async function addRow(page: Page, values: Record<string, string>) {
  await page.getByRole('button', { name: /^Add an? / }).click()
  const form = page.getByRole('dialog')
  for (const [label, value] of Object.entries(values)) {
    await form.getByLabel(label, { exact: true }).fill(value)
  }
  await form.getByRole('button', { name: 'Add', exact: true }).click()
}

/** The row with this code; a long table is searched for it, since it may be on a later page. */
async function rowOf(page: Page, code: string) {
  // An open dialog hides the page from the accessibility tree.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const search = page.getByRole('searchbox', { name: 'Search' })
  const row = page.getByRole('row').filter({ hasText: code })
  // Retried: the row just added can be what makes the table long enough to search.
  await expect(async () => {
    if (await search.count()) await search.fill(code)
    await expect(row).toBeVisible({ timeout: 1000 })
  }).toPass()
  return row
}

test.beforeEach(async ({ page }) => {
  await signIn(page, 'admin')
})

test('a faculty is added and renamed, and its code never changes (#70)', async ({ page }) => {
  const code = unique()
  await openTab(page, 'Faculties')
  await addRow(page, { Code: code, Name: 'Faculty of Testing' })
  const row = await rowOf(page, code)
  await expect(row).toContainText('Faculty of Testing')

  await row.getByRole('button', { name: `Edit ${code}` }).click()
  const edit = page.getByRole('dialog')
  // The code is shown, never offered for editing.
  await expect(edit.getByRole('textbox', { name: `Code for ${code}` })).toHaveCount(0)
  await edit.getByRole('textbox', { name: `Name for ${code}` }).fill('Faculty of Trying')
  await expect(edit).toContainText('Costings already approved will show the new name')
  await edit.getByRole('button', { name: 'Save' }).click()
  await expect(row).toContainText('Faculty of Trying')
  await expect(row.getByRole('button', { name: `Edit ${code}` })).toBeVisible()

  // And there is nothing to remove a faculty with.
  await expect(row.getByRole('button', { name: `Remove ${code}` })).toHaveCount(0)
})

test('a duplicate code is refused on the code field (#70)', async ({ page }) => {
  const code = unique()
  await openTab(page, 'Faculties')
  await addRow(page, { Code: code, Name: 'First' })
  await expect(await rowOf(page, code)).toBeVisible()

  await addRow(page, { Code: code, Name: 'Second' })

  const field = page.getByRole('dialog').getByLabel('Code', { exact: true })
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText(/already exists/)).toBeVisible()
})

test('a department is added under a faculty and moved, asking first (#70)', async ({ page }) => {
  const from = unique()
  const to = unique()
  const department = unique()
  await openTab(page, 'Faculties')
  await addRow(page, { Code: from, Name: `From ${from}` })
  await expect(await rowOf(page, from)).toBeVisible()
  await addRow(page, { Code: to, Name: `To ${to}` })
  await expect(await rowOf(page, to)).toBeVisible()

  await page.getByRole('tab', { name: 'Departments', exact: true }).click()
  await page.getByRole('button', { name: 'Add a department' }).click()
  const form = page.getByRole('dialog')
  await form.getByLabel('Code', { exact: true }).fill(department)
  await form.getByLabel('Name', { exact: true }).fill('Department of Testing')
  await form.getByLabel('School', { exact: true }).fill('School of Testing')
  await form.getByLabel('School code', { exact: true }).fill('SCH')
  await form.getByLabel('Faculty', { exact: true }).click()
  await page.getByRole('option', { name: `From ${from}` }).click()
  await form.getByRole('button', { name: 'Add', exact: true }).click()
  const row = await rowOf(page, department)
  await expect(row).toContainText(`From ${from}`)

  await row.getByRole('button', { name: `Edit ${department}` }).click()
  const edit = page.getByRole('dialog')
  await edit.getByRole('combobox', { name: `Faculty for ${department}` }).click()
  await page.getByRole('option', { name: `To ${to}` }).click()
  await edit.getByRole('button', { name: 'Save' }).click()

  const ask = edit.getByRole('alert')
  await expect(ask).toContainText(`Move ${department} to To ${to}?`)
  await expect(ask).toContainText('No costing from this department is waiting on a dean.')
  await ask.getByRole('button', { name: 'Move' }).click()
  await expect(row).toContainText(`To ${to}`)
})

test('an unused activity can be removed, and the log has every write (#144)', async ({ page }) => {
  const code = unique().slice(0, 10)
  await openTab(page, 'Activities')
  await addRow(page, { Code: code, Name: 'Testing' })
  const row = await rowOf(page, code)
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: `Remove ${code}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row).toHaveCount(0)

  const { results: log } = await (await page.request.get('/api/admin/audit/?action=admin.lookup.delete&limit=20')).json()
  expect(log.some((entry: { object_id: string }) => entry.object_id === code)).toBe(true)
})

test('a region a project uses is refused, saying what uses it (#144)', async ({ page }) => {
  const code = unique().slice(0, 10)
  await openTab(page, 'Regions')
  await addRow(page, { Code: code, Name: 'Testing' })
  await expect(await rowOf(page, code)).toBeVisible()

  // A researcher's project in that region.
  await signIn(page)
  const project = await createProject(page, uniqueTitle('Region'))
  await apiWrite(page, 'patch', `/api/budgets/${project.budget_id}/`, {
    data: { section: 'project', field: 'region', value: code },
  })

  await signIn(page, 'admin')
  await openTab(page, 'Regions')
  const row = await rowOf(page, code)
  await row.getByRole('button', { name: `Remove ${code}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row).toContainText("1 project uses this region, so it can't be removed.")
})
