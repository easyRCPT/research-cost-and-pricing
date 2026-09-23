import {
  test,
  expect,
  createProject,
  openProject,
  goToScreen,
  fillStaffRow,
  uniqueTitle,
} from './fixtures'

/**
 * Tick or untick, and wait for the server to agree.
 *
 * click() rather than check()/uncheck(): those verify the DOM flipped the
 * instant they click, and this control is server-backed, so under load they
 * fail on a state that is merely not back yet.
 */
const toggle = (page: import('@playwright/test').Page, box: import('@playwright/test').Locator) =>
  saved(page, () => box.click())

/** A write, and the round trip it starts. The cells settle before they send. */
const saved = (page: import('@playwright/test').Page, act: () => Promise<void>) =>
  Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/api/budgets/') &&
        response.ok(),
    ),
    act(),
  ])

const REASON = 'Absorbed from the school research support fund'

test('an in-kind line can say why, and the reason survives a reload', async ({
  page,
  request,
}) => {
  const title = uniqueTitle('In-kind reason')
  await createProject(request, title, { start: 2026, end: 2026 })
  await openProject(page, title)
  await goToScreen(page, 'Staff Costs')

  const staffRow = page.locator('tbody tr').first()
  await fillStaffRow(page, staffRow, { name: 'Dr A. Rahman' })
  const time = staffRow.getByRole('spinbutton').first()
  await time.fill('0.5')
  await time.blur()

  await goToScreen(page, 'Adjust Price')
  const row = page.locator('tbody tr').first()

  // Until it is ticked there is nowhere to write, which is the bug this fixes:
  // the column used to be an em-dash on every row (#92).
  await expect(row.getByText('Tick the box to say why')).toBeVisible()

  await toggle(page, row.getByRole('checkbox'))
  const reason = row.getByRole('textbox', { name: /Reason the University/ })
  await expect(reason).toBeVisible()
  await reason.fill(REASON)
  // Wait for the write rather than the blur: the cell settles before it sends,
  // and a reload that beats the request tests nothing.
  await saved(page, () => reason.blur())

  await page.reload()
  await expect(
    page.locator('tbody tr').first().getByRole('textbox', {
      name: /Reason the University/,
    }),
  ).toHaveValue(REASON)
})

test('unticking a line takes its reason away with it', async ({
  page,
  request,
}) => {
  const title = uniqueTitle('In-kind untick')
  await createProject(request, title, { start: 2026, end: 2026 })
  await openProject(page, title)
  await goToScreen(page, 'Staff Costs')

  const staffRow = page.locator('tbody tr').first()
  await fillStaffRow(page, staffRow, { name: 'Dr B. Okafor' })
  const time = staffRow.getByRole('spinbutton').first()
  await time.fill('0.5')
  await time.blur()

  await goToScreen(page, 'Adjust Price')
  const row = page.locator('tbody tr').first()
  await toggle(page, row.getByRole('checkbox'))
  const reason = row.getByRole('textbox', { name: /Reason the University/ })
  await reason.fill(REASON)
  await reason.blur()

  await toggle(page, row.getByRole('checkbox'))
  await expect(row.getByText('Tick the box to say why')).toBeVisible()

  // Cleared on the server, not merely hidden: a reason for absorbing a cost
  // nobody is absorbing would read as though the line were still in-kind.
  await toggle(page, row.getByRole('checkbox'))
  await expect(
    row.getByRole('textbox', { name: /Reason the University/ }),
  ).toHaveValue('')
})
