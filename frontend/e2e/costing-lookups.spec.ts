import { expect, readyProject, submitBudget, test } from './fixtures'

/**
 * A costing's Lookups tab says which rates it shows (#198): today's for a
 * draft, and once submitted, the version it was priced on.
 */

test("a costing's Lookups tab names the rates it was priced on (#198)", async ({
  page,
}) => {
  const project = await readyProject(page, 'Costing lookups')

  await page.goto(`/projects/${project.id}/lookups`)
  await expect(
    page.getByText(
      'These are the current rates, which this draft is priced on.',
    ),
  ).toBeVisible()

  await submitBudget(page, project.budget_id)
  await page.goto(`/projects/${project.id}/lookups`)
  await expect(
    page.getByText(
      /These are the rates this costing was priced on: version #\d+/,
    ),
  ).toBeVisible()
  await expect(
    page.getByText('The current rates may differ.', { exact: false }),
  ).toBeVisible()
})
