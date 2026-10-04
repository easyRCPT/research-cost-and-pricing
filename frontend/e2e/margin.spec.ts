import { expect, goToScreen, readyProject, test } from './fixtures'

/**
 * No cap on the margin (#192): a researcher can price above 100%, up to the
 * 999.99% the server holds. The slider keeps the usual 0 to 100%.
 */

test('a margin above 100% is entered on Adjust Price and saved (#192)', async ({
  page,
}) => {
  const project = await readyProject(page, 'Margin above 100%')
  await page.goto(`/projects/${project.id}/details`)
  await goToScreen(page, 'Adjust Price')

  const margin = page.getByRole('spinbutton', { name: 'Margin percentage' })
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes(`/api/budgets/${project.budget_id}/`) &&
        response.ok(),
    ),
    (async () => {
      await margin.fill('150')
      await margin.blur()
    })(),
  ])

  await expect(page.getByText('Margin at 150')).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('spinbutton', { name: 'Margin percentage' }),
  ).toHaveValue('150')
})
