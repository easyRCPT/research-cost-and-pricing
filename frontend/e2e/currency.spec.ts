import { apiWrite, expect, goToScreen, readyProject, test } from './fixtures'

/**
 * A costing priced in another currency, as the workbook can (#152). Every
 * figure is the server's: these check the screens say which currency and
 * rate, and show AUD beside the price.
 */

test('a costing priced in USD reads in USD, with AUD beside the price (#152)', async ({
  page,
}) => {
  const project = await readyProject(page, 'In USD')
  await apiWrite(
    page,
    'post',
    `/api/budgets/${project.budget_id}/non-staff-lines/`,
    {
      status: 201,
      data: {
        cost_group: 'Advertising and marketing',
        expense_type: 'Advertising, Marketing and Promotional Expenses',
        amounts: [{ year: 2026, amount: 1000 }],
      },
    },
  )

  await page.goto(`/projects/${project.id}/details`)
  await page.getByRole('combobox', { name: 'Budget currency' }).click()
  await page.getByRole('option', { name: 'USD - United States Dollar' }).click()
  await expect(page.getByText('1 AUD = 0.70285 USD')).toBeVisible()
  await expect(
    page.getByText('Changing the currency or its rate converts them'),
  ).toBeVisible()

  // The non-staff amount kept its AUD value: 1,000 AUD is 702.85 USD.
  const detail = await (
    await page.request.get(`/api/budgets/${project.budget_id}/`)
  ).json()
  expect(detail.non_staff_cost.lines[0].by_year[0].amount).toBe(702.85)

  await page.goto(`/projects/${project.id}/price`)
  await expect(
    page.getByRole('columnheader', { name: 'Full Project Cost (USD)' }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Priced in USD at 1 AUD = 0.70285 USD, the rates table rate',
    ),
  ).toBeVisible()
  const priceInAud = Math.round(
    detail.budget_summary.in_aud.price_summary.total_price_inc_gst,
  )
  await expect(
    page.getByText(`AUD ${priceInAud.toLocaleString('en-AU')}`).first(),
  ).toBeVisible()

  await goToScreen(page, 'Staff Costs')
  await expect(page.getByRole('cell', { name: 'Amount in AUD' })).toBeVisible()

  // A rate of the researcher's own, in place of the table's.
  await goToScreen(page, 'Project Details')
  await page.getByRole('checkbox', { name: 'Use a rate of my own' }).check()
  await page
    .getByRole('spinbutton', { name: 'My rate, USD per AUD' })
    .fill('0.5')
  await expect
    .poll(async () => {
      const info = (
        await (
          await page.request.get(`/api/budgets/${project.budget_id}/`)
        ).json()
      ).budget_info
      return info.exchange_rate
    })
    .toBe(0.5)
  await page.goto(`/projects/${project.id}/price`)
  await expect(
    page.getByText(
      'Priced in USD at 1 AUD = 0.5 USD, a rate set for this costing',
    ),
  ).toBeVisible()
})

test('the currency rates are a lookup table anyone can read (#152)', async ({
  page,
}) => {
  const project = await readyProject(page, 'Currency tab')
  await page.goto(`/projects/${project.id}/lookups`)
  await page.getByRole('tab', { name: 'Currencies' }).click()
  await page.getByPlaceholder('Search').fill('USD')

  const usd = page
    .getByRole('row')
    .filter({ hasText: 'USD - United States Dollar' })
  await expect(usd).toContainText('0.702850')
  await expect(usd).toContainText('1.422779')
})
