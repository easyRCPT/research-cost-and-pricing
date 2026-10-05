import type { Locator, Page } from '@playwright/test'

import {
  apiWrite,
  expect,
  readyProject,
  signIn,
  submitBudget,
  test,
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
  const left = (lookups.eba_increases as { year: number }[]).filter((row) =>
    YEARS.includes(row.year),
  )
  if (left.length === 0) return
  await apiWrite(page, 'post', '/api/admin/lookups/changes/', {
    status: 201,
    data: {
      note: 'e2e clean-up',
      changes: left.map((row) => ({
        table: 'eba_increases',
        op: 'delete',
        lookup: { year: row.year },
      })),
    },
  })
}

const LEDGER = 99901

/** Takes out the non-staff category a failed run left behind. */
async function removeOurCategory(page: Page) {
  const lookups = await (await page.request.get('/api/lookups/')).json()
  const left = (
    lookups.non_staff_cost_categories as { ledger_id: number }[]
  ).some((row) => row.ledger_id === LEDGER)
  if (!left) return
  await apiWrite(page, 'post', '/api/admin/lookups/changes/', {
    status: 201,
    data: {
      note: 'e2e clean-up',
      changes: [
        {
          table: 'non_staff_cost_categories',
          op: 'delete',
          lookup: { ledger_id: LEDGER },
        },
      ],
    },
  })
}

// The ISO code kept for testing: no costing is ever priced in it.
const TEST_CURRENCY = 'XTS'

/** Takes out the test currency a failed run left behind. */
async function removeOurCurrency(page: Page) {
  const lookups = await (await page.request.get('/api/lookups/')).json()
  const left = (lookups.currencies as { code: string }[]).some(
    (row) => row.code === TEST_CURRENCY,
  )
  if (!left) return
  await apiWrite(page, 'post', '/api/admin/lookups/changes/', {
    status: 201,
    data: {
      note: 'e2e clean-up',
      changes: [
        { table: 'currencies', op: 'delete', lookup: { code: TEST_CURRENCY } },
      ],
    },
  })
}

async function ebaYears(page: Page): Promise<number[]> {
  const lookups = await (await page.request.get('/api/lookups/')).json()
  return (lookups.eba_increases as { year: number }[]).map((row) => row.year)
}

async function openEditor(page: Page) {
  await page.goto('/admin/lookups')
  await expect(
    page.getByRole('heading', { name: 'Lookup tables' }),
  ).toBeVisible()
}

async function openTab(page: Page, tab: string) {
  await page
    .getByRole('tablist', { name: 'Lookup tables' })
    .getByRole('tab', { name: new RegExp(`^${tab}`) })
    .click()
}

/** Fills a rate table's Add row dialog and adds the row. */
async function addRow(page: Page, fill: (form: Locator) => Promise<void>) {
  await page.getByRole('button', { name: 'Add row' }).click()
  const form = page.getByRole('dialog')
  await fill(form)
  await form.getByRole('button', { name: 'Add', exact: true }).click()
}

async function stageYear(page: Page, year: number, increase: string) {
  await openTab(page, 'EBA Increases')
  await addRow(page, async (form) => {
    await form.getByLabel('Year', { exact: true }).fill(String(year))
    await form.getByLabel('Increase', { exact: true }).fill(increase)
  })
}

async function reviewAndSave(page: Page, note: string) {
  await page.getByRole('button', { name: 'Review changes' }).click()
  await page.getByPlaceholder('For example, 2027 EBA increase').fill(note)
  await page.getByRole('button', { name: 'Save changes' }).click()
}

test.beforeEach(async ({ page }) => {
  await signIn(page, 'admin')
  await removeOurYears(page)
  await removeOurCategory(page)
  await removeOurCurrency(page)
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  await signIn(page, 'admin')
  await removeOurYears(page)
  await removeOurCategory(page)
  await removeOurCurrency(page)
  await page.close()
})

test('edits across tabs are held until reviewed, then saved as one set (#138)', async ({
  page,
}) => {
  await openEditor(page)
  await stageYear(page, 2090, '0.031')

  // A change in another table, then back: both are still held.
  await openTab(page, 'Salary Rates')
  // The rates say which year they are for (#148).
  await expect(
    page.getByText(
      /These are \d{4} rates: each later year adds that year.s EBA increase/,
    ),
  ).toBeVisible()
  const firstRate = page.getByRole('spinbutton', { name: /^Rate for / }).first()
  const was = await firstRate.inputValue()
  await firstRate.fill(String(Number(was) + 1))
  await expect(page.getByText(`was ${Number(was)}`)).toBeVisible()
  await stageYear(page, 2091, '0.032')

  const bar = page.getByRole('region', { name: 'Unsaved changes' })
  await expect(bar).toContainText('3 changes across 2 tables')
  await expect(page.getByRole('row').filter({ hasText: '2090' })).toContainText(
    'New',
  )

  // Nothing has reached the server yet.
  expect(await ebaYears(page)).not.toContain(2090)

  // Undo the salary edit: only the two years go in the set.
  await openTab(page, 'Salary Rates')
  await page.getByRole('button', { name: /^Undo the change to / }).click()
  await expect(bar).toContainText('2 changes across 1 table')

  await page.getByRole('button', { name: 'Review changes' }).click()
  const review = page.getByRole('region', { name: 'EBA increases' })
  await expect(review).toContainText('2090')
  await expect(review).toContainText('2091')
  await expect(
    page.getByText(/^(Saves into version #\d+\.|Starts a new version: )/),
  ).toBeVisible()

  const note = uniqueTitle('Set')
  await page.getByPlaceholder('For example, 2027 EBA increase').fill(note)
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(
    page.getByRole('status').filter({ hasText: '2 changes saved' }),
  ).toBeVisible()
  await expect(bar).toHaveCount(0)
  expect(await ebaYears(page)).toEqual(expect.arrayContaining([2090, 2091]))
  // The version history shows the set, with its note and size.
  await page.goto('/admin/versions')
  await page
    .getByRole('button', { name: /^Show changes saved into version #\d+$/ })
    .first()
    .click()
  // Saves and the changes in them are closed until asked for.
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('EBA increases: 2090')).toHaveCount(0)
  await dialog.getByRole('button', { name: new RegExp(note) }).click()
  await expect(dialog.getByText('EBA increases: 2091')).toBeVisible()
  await expect(dialog.getByText('Added', { exact: true })).toHaveCount(2)
  await dialog.getByRole('button', { name: /EBA increases: 2090/ }).click()
  await expect(
    dialog.getByRole('table', {
      name: 'Figures changed on EBA increases: 2090',
    }),
  ).toContainText('Increase')
  await openEditor(page)

  // And one entry in the log for the whole set.
  const { results: log } = await (
    await page.request.get(
      '/api/admin/audit/?action=admin.lookup.changes&limit=5',
    )
  ).json()
  const entry = log.find(
    (row: { detail: { note: string } }) => row.detail.note === note,
  )
  expect(entry.detail.changes).toHaveLength(2)

  // Removing is a change like any other.
  await openTab(page, 'EBA Increases')
  await page.getByRole('button', { name: 'Remove 2090' }).click()
  await page.getByRole('button', { name: 'Remove 2091' }).click()
  await reviewAndSave(page, 'e2e: take the years out again')
  await expect(bar).toHaveCount(0)
  await expect.poll(() => ebaYears(page)).not.toContain(2090)
})

test('a set with one refused change saves nothing and marks that row (#138)', async ({
  page,
}) => {
  await openEditor(page)
  await stageYear(page, 2092, '0.03')
  await stageYear(page, 2093, '-1')

  await reviewAndSave(page, 'e2e: refused')

  await expect(page.getByText('Nothing was saved')).toBeVisible()
  const refused = page.getByRole('row').filter({ hasText: '2093' })
  await expect(refused).toHaveAttribute('aria-invalid', 'true')
  await expect(refused).toContainText('greater than or equal to 0')
  const increase = refused.getByRole('spinbutton')
  await expect(increase).toHaveAttribute('aria-invalid', 'true')
  await expect(increase).toHaveAccessibleDescription(
    /greater than or equal to 0/,
  )
  expect(await ebaYears(page)).not.toContain(2092)

  // Still held, so it can be put right and saved.
  await increase.fill('0.04')
  await expect(increase).not.toHaveAttribute('aria-describedby')
  await page.getByRole('button', { name: 'Review changes' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: '2 changes saved' }),
  ).toBeVisible()
  expect(await ebaYears(page)).toEqual(expect.arrayContaining([2092, 2093]))
})

test('leaving with unsaved changes asks first (#138)', async ({ page }) => {
  await openEditor(page)
  await stageYear(page, 2094, '0.03')
  const rail = page.getByRole('navigation', { name: 'Admin sections' })

  await rail.getByRole('button', { name: 'Overview' }).click()
  const ask = page.getByRole('alertdialog', { name: 'Leave without saving?' })
  await expect(ask).toContainText('1 change across 1 table has not been saved')
  await ask.getByRole('button', { name: 'Stay' }).click()
  await expect(page).toHaveURL('/admin/lookups')
  await expect(page.getByRole('row').filter({ hasText: '2094' })).toContainText(
    'New',
  )

  await rail.getByRole('button', { name: 'Overview' }).click()
  await page.getByRole('button', { name: 'Leave without saving' }).click()
  await expect(page).toHaveURL('/admin')
  expect(await ebaYears(page)).not.toContain(2094)
})

test('a set that starts a new version says who was priced on the old one, and links to them (#142)', async ({
  page,
}) => {
  // A researcher's costing, submitted on the current rates.
  await signIn(page)
  const project = await readyProject(page, 'Priced on')
  const { title } = project
  await submitBudget(page, project.budget_id)

  await signIn(page, 'admin')
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
  await expect(
    listed.getByRole('row').filter({ hasText: title }),
  ).toContainText('HoD review')

  await listed.getByRole('link', { name: title }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/details`)
})

test('a non-staff category is a rate: added, changed and removed through sets (#144)', async ({
  page,
}) => {
  await openEditor(page)
  await openTab(page, 'Non-Staff Expenses')
  await addRow(page, async (form) => {
    await form.getByLabel('Ledger ID', { exact: true }).fill(String(LEDGER))
    await form.getByLabel('Cost group', { exact: true }).fill('E2E group')
    await form.getByLabel('Expense type', { exact: true }).fill('E2E expense')
    await form.getByLabel('No 10%', { exact: true }).check()
  })
  await reviewAndSave(page, 'e2e: a category')
  await expect(
    page.getByRole('status').filter({ hasText: '1 change saved' }),
  ).toBeVisible()

  // Its flag prices a costing, so it is changed in a set too. The table is long, so search for it.
  await page.getByRole('searchbox', { name: 'Search' }).fill(String(LEDGER))
  const row = page.getByRole('row').filter({ hasText: String(LEDGER) })
  await row.getByRole('checkbox', { name: `No 10% for ${LEDGER}` }).uncheck()
  await expect(row).toContainText('was Yes')
  await page.getByRole('button', { name: 'Review changes' }).click()
  await expect(
    page.getByRole('region', { name: 'Non-staff categories' }),
  ).toContainText('No 10% Yes → No')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.getByRole('region', { name: 'Unsaved changes' }),
  ).toHaveCount(0)
  const flag = async () =>
    (
      (await (await page.request.get('/api/lookups/')).json())
        .non_staff_cost_categories as {
        ledger_id: number
        excludes_additional_rate: boolean
      }[]
    ).find((category) => category.ledger_id === LEDGER)
      ?.excludes_additional_rate
  await expect.poll(flag).toBe(false)

  await row.getByRole('button', { name: `Remove ${LEDGER}` }).click()
  await reviewAndSave(page, 'e2e: the category again')
  await expect.poll(flag).toBeUndefined()
})

test('a currency is a rate: added, changed and removed through sets, and AUD stays at 1 (#152)', async ({
  page,
}) => {
  await openEditor(page)
  await openTab(page, 'Currencies')
  await addRow(page, async (form) => {
    await form.getByLabel('Code', { exact: true }).fill(TEST_CURRENCY)
    await form.getByLabel('Name', { exact: true }).fill('Testing Currency')
    await form.getByLabel('1 AUD =', { exact: true }).fill('2.5')
  })
  await reviewAndSave(page, 'e2e: a currency')
  await expect(
    page.getByRole('status').filter({ hasText: '1 change saved' }),
  ).toBeVisible()

  const rate = async () =>
    (
      (await (await page.request.get('/api/lookups/')).json()).currencies as {
        code: string
        rate: number
      }[]
    ).find((currency) => currency.code === TEST_CURRENCY)?.rate
  await expect.poll(rate).toBe(2.5)

  await page.getByRole('searchbox', { name: 'Search' }).fill(TEST_CURRENCY)
  const row = page.getByRole('row').filter({ hasText: TEST_CURRENCY })
  await row
    .getByRole('spinbutton', { name: `1 AUD = for ${TEST_CURRENCY}` })
    .fill('2.75')
  await reviewAndSave(page, 'e2e: the currency moved')
  await expect.poll(rate).toBe(2.75)

  await row.getByRole('button', { name: `Remove ${TEST_CURRENCY}` }).click()
  await reviewAndSave(page, 'e2e: the currency again')
  await expect.poll(rate).toBeUndefined()

  // AUD is the base: the server refuses to move it, against its row.
  await page.getByRole('searchbox', { name: 'Search' }).fill('AUD')
  const audRate = page.getByRole('spinbutton', { name: '1 AUD = for AUD' })
  const aud = page.getByRole('row').filter({ has: audRate })
  await audRate.fill('1.1')
  await reviewAndSave(page, 'e2e: refused')
  await expect(aud).toContainText(
    'AUD is the base currency: its rate is always 1.',
  )
  await page.getByRole('button', { name: 'Discard all' }).click()
})

test('constants read as what they are, take 30% or 0.30, and refuse a bare 25 (#151)', async ({
  page,
}) => {
  await openEditor(page)
  await openTab(page, 'Constants')
  const floor = page.getByRole('row').filter({ hasText: 'Minimum margin' })
  await expect(floor).toContainText(
    'A budget priced below this margin needs the Dean',
  )
  const value = floor.getByRole('textbox', { name: 'Value for minimum_margin' })

  // A bare 25 is refused by the server, against the row, and nothing is saved.
  await value.fill('25')
  await page.getByRole('button', { name: 'Review changes' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(floor).toHaveAttribute('aria-invalid', 'true')
  await expect(floor).toContainText('Did you mean 25%? Enter 0.25 or 25%.')

  // A percentage reads as its decimal, and a floor above the default warns.
  await value.fill('35%')
  await expect(floor).toContainText('= 35%')
  await page.getByRole('button', { name: 'Review changes' }).click()
  const review = page.getByRole('region', { name: 'Constants' })
  await expect(review).toContainText('30% → 35%')
  await expect(
    page.getByText('will be above the default margin (30%)'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()

  // A multiplier is not a percentage.
  const multiplier = page
    .getByRole('row')
    .filter({ hasText: 'Full Cost Recovery Multiplier' })
    .getByRole('textbox', { name: 'Value for full_cost_recovery_multiplier' })
  await multiplier.fill('170%')
  await expect(
    page.getByText('Enter this as a number, not a percentage.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Discard all' }).click()
  await expect(
    page.getByRole('region', { name: 'Unsaved changes' }),
  ).toHaveCount(0)
})

test('the version history filters by the dates versions were made', async ({
  page,
}) => {
  await page.goto('/admin/versions')
  await expect(
    page.getByRole('heading', { name: 'Lookup history' }),
  ).toBeVisible()
  // The server's day, which the filter is read in, not the browser's.
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Australia/Melbourne',
  })

  await page.getByRole('button', { name: 'Made' }).first().click()
  await page.getByLabel('To', { exact: true }).fill('2000-01-01')
  await expect(page.getByText('No rows match.')).toBeVisible()
  await expect(page.getByText('to 1 Jan 2000')).toBeVisible()

  // A range that holds today brings the rows back.
  await page.getByLabel('From', { exact: true }).fill('2000-01-01')
  await page.getByLabel('To', { exact: true }).fill(today)
  await expect(page.getByText('No rows match.')).toHaveCount(0)
  await expect(
    page
      .getByRole('button', { name: /^Show changes saved into version/ })
      .first(),
  ).toBeVisible()
})
