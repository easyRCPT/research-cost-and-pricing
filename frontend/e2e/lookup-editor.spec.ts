import type { Page } from '@playwright/test'
import {
  test,
  expect,
  createProject,
  csrfToken,
  DEMO,
  makeReady,
  signIn,
  signInAsAdmin,
  uniqueTitle,
} from './fixtures'

/**
 * Rate edits saved as one reviewed set (#138), and who was priced on the
 * rates a set replaced (#142).
 *
 * Rates are shared by every spec, so these only add and remove EBA years far
 * past any project's dates, which no other spec prices. Serial, because the
 * #142 test needs its own submission to be the newest thing priced on the
 * rates it replaces.
 */
test.describe.configure({ mode: 'serial' })

const YEARS = [2090, 2091, 2092, 2093, 2094]

/** Takes out any of this spec's years a failed run left behind. */
async function removeOurYears(page: Page) {
  const lookups = await (await page.request.get('/api/lookups/')).json()
  const left = (lookups.eba_increases as { year: number }[]).filter((row) => YEARS.includes(row.year))
  if (left.length === 0) return
  const response = await page.request.post('/api/admin/lookups/changes/', {
    headers: { 'X-CSRFToken': await csrfToken(page) },
    data: {
      note: 'e2e clean-up',
      changes: left.map((row) => ({ table: 'eba_increases', op: 'delete', lookup: { year: row.year } })),
    },
  })
  expect(response.status(), await response.text()).toBe(201)
}

async function ebaYears(page: Page): Promise<number[]> {
  const lookups = await (await page.request.get('/api/lookups/')).json()
  return (lookups.eba_increases as { year: number }[]).map((row) => row.year)
}

async function openEditor(page: Page) {
  await page.goto('/admin/lookups')
  await expect(page.getByRole('heading', { name: 'Lookup tables' })).toBeVisible()
}

async function stageYear(page: Page, year: number, increase: string) {
  await page.getByRole('tab', { name: /EBA increases/ }).click()
  await page.getByLabel('Year', { exact: true }).fill(String(year))
  await page.getByLabel('Increase', { exact: true }).fill(increase)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
}

async function reviewAndSave(page: Page, note: string) {
  await page.getByRole('button', { name: 'Review changes' }).click()
  await page.getByPlaceholder('For example, 2027 EBA increase').fill(note)
  await page.getByRole('button', { name: 'Save changes' }).click()
}

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page)
  await removeOurYears(page)
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  await signInAsAdmin(page)
  await removeOurYears(page)
  await page.close()
})

test('edits across tabs are held until reviewed, then saved as one set (#138)', async ({ page }) => {
  await openEditor(page)
  await stageYear(page, 2090, '0.031')

  // A change in another table, then back: both are still held.
  await page.getByRole('tab', { name: /Salary rates/ }).click()
  const firstRate = page.getByRole('spinbutton', { name: /^Rate for / }).first()
  const was = await firstRate.inputValue()
  await firstRate.fill(String(Number(was) + 1))
  await expect(page.getByText(`was ${Number(was)}`)).toBeVisible()
  await stageYear(page, 2091, '0.032')

  const bar = page.getByRole('region', { name: 'Unsaved changes' })
  await expect(bar).toContainText('3 changes across 2 tables')
  await expect(page.getByRole('row').filter({ hasText: '2090' })).toContainText('New')

  // Nothing has reached the server yet.
  expect(await ebaYears(page)).not.toContain(2090)

  // Undo the salary edit: only the two years go in the set.
  await page.getByRole('tab', { name: /Salary rates/ }).click()
  await page.getByRole('button', { name: /^Undo the change to / }).click()
  await expect(bar).toContainText('2 changes across 1 table')

  await page.getByRole('button', { name: 'Review changes' }).click()
  const review = page.getByRole('region', { name: 'EBA increases' })
  await expect(review).toContainText('2090')
  await expect(review).toContainText('2091')
  await expect(page.getByText(/^(Saves into version #\d+\.|Starts a new version: costings are already priced on version #\d+)/)).toBeVisible()

  const note = uniqueTitle('Set')
  await page.getByPlaceholder('For example, 2027 EBA increase').fill(note)
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByRole('status').filter({ hasText: '2 changes saved' })).toBeVisible()
  await expect(bar).toHaveCount(0)
  expect(await ebaYears(page)).toEqual(expect.arrayContaining([2090, 2091]))
  // The versions list shows the set, with its note and size.
  await expect(page.getByRole('listitem').filter({ hasText: note })).toContainText('2 changes')

  // And one entry in the log for the whole set.
  const log = await (await page.request.get('/api/admin/audit/?action=admin.lookup.changes&limit=5')).json()
  const entry = log.find((row: { detail: { note: string } }) => row.detail.note === note)
  expect(entry.detail.changes).toHaveLength(2)

  // Removing is a change like any other.
  await page.getByRole('tab', { name: /EBA increases/ }).click()
  await page.getByRole('button', { name: 'Remove 2090' }).click()
  await page.getByRole('button', { name: 'Remove 2091' }).click()
  await reviewAndSave(page, 'e2e: take the years out again')
  await expect(bar).toHaveCount(0)
  await expect.poll(() => ebaYears(page)).not.toContain(2090)
})

test('a set with one refused change saves nothing and marks that row (#138)', async ({ page }) => {
  await openEditor(page)
  await stageYear(page, 2092, '0.03')
  await stageYear(page, 2093, '-1')

  await reviewAndSave(page, 'e2e: refused')

  await expect(page.getByText('Nothing was saved')).toBeVisible()
  const refused = page.getByRole('row').filter({ hasText: '2093' })
  await expect(refused).toHaveAttribute('aria-invalid', 'true')
  await expect(refused).toContainText('greater than or equal to 0')
  expect(await ebaYears(page)).not.toContain(2092)

  // Still held, so it can be put right and saved.
  await refused.getByRole('spinbutton').fill('0.04')
  await page.getByRole('button', { name: 'Review changes' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status').filter({ hasText: '2 changes saved' })).toBeVisible()
  expect(await ebaYears(page)).toEqual(expect.arrayContaining([2092, 2093]))
})

test('leaving with unsaved changes asks first (#138)', async ({ page }) => {
  await openEditor(page)
  await stageYear(page, 2094, '0.03')
  const rail = page.getByRole('navigation', { name: 'Admin sections' })

  await rail.getByRole('button', { name: 'Overview' }).click()
  const ask = page.getByRole('alertdialog', { name: 'Unsaved changes' })
  await expect(ask).toContainText('1 change across 1 table has not been saved')
  await ask.getByRole('button', { name: 'Stay' }).click()
  await expect(page).toHaveURL('/admin/lookups')
  await expect(page.getByRole('row').filter({ hasText: '2094' })).toContainText('New')

  await rail.getByRole('button', { name: 'Overview' }).click()
  await page.getByRole('button', { name: 'Leave without saving' }).click()
  await expect(page).toHaveURL('/admin')
  expect(await ebaYears(page)).not.toContain(2094)
})

test('a set that starts a new version says who was priced on the old one, and links to them (#142)', async ({
  page,
}) => {
  // A researcher's costing, submitted on the current rates.
  await page.context().clearCookies()
  await signIn(page)
  const title = uniqueTitle('Priced on')
  const project = await createProject(page, title, { start: 2026, end: 2026 }, DEMO.hodDepartment)
  await makeReady(page, project.budget_id)
  const submitted = await page.request.post(`/api/budgets/${project.budget_id}/submit/`, {
    headers: { 'X-CSRFToken': await csrfToken(page) },
  })
  expect(submitted.status(), await submitted.text()).toBe(200)

  await signInAsAdmin(page)
  await openEditor(page)
  await stageYear(page, 2090, '0.03')
  await page.getByRole('button', { name: 'Review changes' }).click()
  await expect(page.getByText(/^Starts a new version/)).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()

  const notice = page.getByRole('status').filter({ hasText: '1 change saved' })
  await expect(notice).toContainText('They started version')
  await expect(notice).toContainText(/\d+ costings? in review/)

  await notice.getByRole('button', { name: 'See them' }).click()
  const listed = page.getByRole('table', { name: /Costings priced on version/ })
  await expect(listed.getByRole('row').filter({ hasText: title })).toContainText('Head of Department review')

  await listed.getByRole('link', { name: title }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/details`)
})
