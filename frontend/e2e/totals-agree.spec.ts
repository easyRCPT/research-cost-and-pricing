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
 * Regression for the optimistic echo speaking for money it could not know.
 *
 * `withTime` rebuilds the whole by_year array to change one year's time and
 * copies the old costs across. Spread over the server's reply, that put the
 * cost of the previous time beside the new one and left it there: the year
 * cell said one number and the row total another, with the row total right.
 *
 * On a single year project the two must be the same number, which is what
 * makes this checkable without knowing what the engine will say.
 */
test('the year total and the row total agree after a time is changed', async ({
  page,
}) => {
  const title = uniqueTitle('Totals agree')
  await createProject(page, title, { start: 2026, end: 2026 })
  await openProject(page, title)
  await goToScreen(page, 'Staff Costs')

  const row = page.locator('tbody tr').first()
  await fillStaffRow(page, row, { name: 'Dr A. Rahman' })

  const time = row.getByRole('spinbutton').first()
  const yearTotal = row.locator('td').nth(-3)
  const rowTotal = row.locator('td').nth(-2)

  await time.fill('0.25')
  await time.blur()
  await expect(yearTotal).not.toHaveText('—')
  const first = await yearTotal.textContent()
  expect(await rowTotal.textContent()).toBe(first)

  // The edit that used to leave the year cell behind.
  await time.fill('1')
  await time.blur()
  await expect(yearTotal).not.toHaveText(first ?? '')
  expect(await rowTotal.textContent()).toBe(await yearTotal.textContent())
})
