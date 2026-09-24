import {
  test,
  expect,
  createProject,
  openProject,
  goToScreen,
  fillStaffRow,
  uniqueTitle,
} from './fixtures'

test('a staff row prices, and is still there after a reload', async ({
  page,
}) => {
  const title = uniqueTitle('Staff costs')
  await createProject(page, title, { start: 2026, end: 2026 })
  await openProject(page, title)
  await goToScreen(page, 'Staff Costs')

  const row = page.locator('tbody tr').first()
  await fillStaffRow(page, row, { name: 'Dr A. Rahman' })

  const time = row.getByRole('spinbutton').first()
  await time.fill('0.5')
  await time.blur()

  // The engine answers, so the row stops showing a dash where its cost goes.
  const rowTotal = row.locator('td').nth(-2)
  await expect(rowTotal).not.toHaveText('—')

  // And it is a saved row, not a draft held in the browser. Since #43 the
  // screen is a URL, so a reload comes back to it rather than to the list.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Staff Costs' })).toBeVisible()
  await expect(page.locator('input[value="Dr A. Rahman"]')).toBeVisible()
  await expect(
    page.locator('tbody tr').first().locator('td').nth(-2),
  ).not.toHaveText('—')
})
