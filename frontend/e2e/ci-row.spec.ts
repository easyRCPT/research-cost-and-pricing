import { expect, goToScreen, readyProject, test } from './fixtures'

/**
 * The chief investigator's cost is a row of its own, added by a tick (#166).
 * The project names Dr Ruth Researcher as CI; its only staff row is Dr Chen's.
 */

test('naming a CI takes over no row, and Include Chief Investigator cost adds the CI row (#166)', async ({
  page,
}) => {
  const project = await readyProject(page, 'CI row')
  await page.goto(`/projects/${project.id}/details`)
  await goToScreen(page, 'Staff Costs')

  const names = page.locator('tbody tr td:first-child input')
  // Dr Chen's row is still Dr Chen's, though it is first.
  await expect(names.first()).toHaveValue('Dr Chen')

  const include = page.getByRole('checkbox', {
    name: 'Include Chief Investigator cost',
  })
  await expect(include).not.toBeChecked()

  // The CI's row leads, and Dr Chen's follows it unchanged.
  await include.check()
  await expect(names.first()).toHaveValue('Dr Ruth Researcher')
  await expect(names.nth(1)).toHaveValue('Dr Chen')

  // Rate it, so it is saved, and the tick survives a reload.
  const ciRow = page.locator('tbody tr').filter({
    has: page.locator('input[value="Dr Ruth Researcher"]'),
  })
  const choices = ciRow.getByRole('combobox')
  for (const [index, option] of [
    'Continuing',
    'Academic',
    'Level B.1',
  ].entries()) {
    await choices.nth(index).click()
    await page.getByRole('option', { name: option, exact: true }).click()
  }
  await expect
    .poll(async () => {
      const detail = await (
        await page.request.get(`/api/budgets/${project.budget_id}/`)
      ).json()
      return detail.staff_cost.lines.map(
        (line: { name_role: string; is_ci: boolean }) => [
          line.name_role,
          line.is_ci,
        ],
      )
    })
    .toContainEqual(['Dr Ruth Researcher', true])

  await page.reload()
  await expect(
    page.getByRole('checkbox', { name: 'Include Chief Investigator cost' }),
  ).toBeChecked()

  // Unticking takes the CI row away, and only that row. The row is saved, so
  // the box unticks once the server has removed it: click(), not uncheck(),
  // which wants the box to flip the instant it is clicked.
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response
          .url()
          .includes(`/api/budgets/${project.budget_id}/staff-lines/`) &&
        response.ok(),
    ),
    page
      .getByRole('checkbox', { name: 'Include Chief Investigator cost' })
      .click(),
  ])
  await expect(
    page.getByRole('checkbox', { name: 'Include Chief Investigator cost' }),
  ).not.toBeChecked()
  await expect(names.first()).toHaveValue('Dr Chen')
  await expect(
    page.locator('tbody input[value="Dr Ruth Researcher"]'),
  ).toHaveCount(0)
})
