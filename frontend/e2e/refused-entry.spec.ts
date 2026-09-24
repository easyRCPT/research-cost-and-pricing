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
 * Regression for two faults that met on the same cell.
 *
 * An out-of-range number used to be silently replaced with the cap, so the
 * entry looked accepted and what was typed was gone before anyone read why.
 * And a row the server refused was dropped from the draft layer before the
 * reply came back, so it vanished from the screen as it was being filled in.
 */
test('an over-cap entry stays on screen, marked, and the row survives', async ({
  page,
}) => {
  const title = uniqueTitle('Over cap')
  await createProject(page, title, { start: 2026, end: 2026 })
  await openProject(page, title)
  await goToScreen(page, 'Staff Costs')

  const row = page.locator('tbody tr').first()
  await fillStaffRow(page, row, {
    name: 'Field technician',
    employment: 'Casual',
    basis: 'Hourly',
  })

  // An hourly row stops at a calendar year of hours.
  const time = row.getByRole('spinbutton').first()
  await time.fill('99999')

  // Kept, not rewritten to the cap.
  await expect(time).toHaveValue('99999')
  await expect(time).toHaveAttribute('aria-invalid', 'true')

  // And the row is still there to be corrected.
  await expect(page.locator('input[value="Field technician"]')).toBeVisible()

  await time.fill('100')
  await time.blur()
  await expect(time).not.toHaveAttribute('aria-invalid', 'true')
})
