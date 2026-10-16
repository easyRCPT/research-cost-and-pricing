import { apiWrite, expect, readyProject, test } from './fixtures'

/**
 * The Cost and Price Summary explains how the requested price is reached
 * (#213): full project cost, the University contributions, and the steps
 * between them, with the note that margin is not applied to in-kind.
 */
test('the Cost and Price Summary walks from full cost to the funder price (#213)', async ({
  page,
}) => {
  const project = await readyProject(page, 'Cost and price summary')
  // readyProject's staff line stays charged to the funder; add an in-kind
  // non-staff line so the costing has both kinds of cost, plus a cash
  // co-contribution and a non-zero margin.
  await apiWrite(page, 'post', `/api/budgets/${project.budget_id}/non-staff-lines/`, {
    status: 201,
    data: {
      cost_group: 'Advertising and marketing',
      expense_type: 'Advertising, Marketing and Promotional Expenses',
      in_kind: true,
      in_kind_reason: 'Absorbed by the school',
      amounts: [{ year: 2026, amount: 1000 }],
    },
  })
  await apiWrite(page, 'patch', `/api/budgets/${project.budget_id}/`, {
    data: { section: 'budget', field: 'cash_co_contribution', value: 5000 },
  })
  await apiWrite(page, 'patch', `/api/budgets/${project.budget_id}/`, {
    data: { section: 'budget', field: 'margin', value: 0.3 },
  })

  await page.goto(`/projects/${project.id}/price`)

  await expect(
    page.getByRole('heading', { name: 'Cost and Price Summary' }).first(),
  ).toBeVisible()
  await expect(
    page.getByText('Full project cost (including in-kind)'),
  ).toBeVisible()
  await expect(
    page.getByText('In-kind contributions (University investment)').first(),
  ).toBeVisible()
  await expect(
    page.getByText(/Margin at 30\.0% — not applied to in-kind contributions/),
  ).toBeVisible()
  await expect(
    page.getByText('Price to be charged to the funder (including GST)'),
  ).toBeVisible()
  await expect(
    page.getByRole('cell', { name: 'Cash co-contributions' }),
  ).toBeVisible()
  await expect(page.getByText('University position')).toBeVisible()
})
