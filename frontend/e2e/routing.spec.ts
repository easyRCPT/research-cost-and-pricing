import { createProject, expect, test, uniqueTitle } from './fixtures'

/**
 * The costing flow lives at a URL now (#43).
 *
 * Before the router, the screen was React state: a reload returned to the
 * projects list and nothing could be linked to. These hold that down.
 */

test('a screen can be linked to, and opens on a cold load', async ({
  page,
}) => {
  const project = await createProject(page, uniqueTitle('Deep linked'))

  await page.goto(`/projects/${project.id}/staff`)

  await expect(page.getByRole('heading', { name: 'Staff Costs' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Staff Costs', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('the rail writes the URL, and browser Back returns to the last screen', async ({
  page,
}) => {
  const project = await createProject(page, uniqueTitle('Back and forward'))

  await page.goto(`/projects/${project.id}/details`)
  await page.getByRole('button', { name: 'Staff Costs', exact: true }).click()

  await expect(page).toHaveURL(`/projects/${project.id}/staff`)
  await expect(page.getByRole('heading', { name: 'Staff Costs' })).toBeVisible()

  await page.goBack()

  await expect(page).toHaveURL(`/projects/${project.id}/details`)
  await expect(
    page.getByRole('heading', { name: 'Project Details' }),
  ).toBeVisible()
})

test('Continue and Back move through the URL too', async ({ page }) => {
  const project = await createProject(page, uniqueTitle('Continue'))

  await page.goto(`/projects/${project.id}/details`)
  await page.getByRole('button', { name: /^Continue to / }).click()

  await expect(page).toHaveURL(`/projects/${project.id}/staff`)

  await page.getByRole('button', { name: 'Back', exact: true }).click()

  await expect(page).toHaveURL(`/projects/${project.id}/details`)
})

test('a screen nobody has lands on the first one', async ({ page }) => {
  const project = await createProject(page, uniqueTitle('Stale screen'))

  await page.goto(`/projects/${project.id}/nonsense`)

  await expect(page).toHaveURL(`/projects/${project.id}/details`)
  await expect(
    page.getByRole('heading', { name: 'Project Details' }),
  ).toBeVisible()
})

test('the lookups screen is a screen, with nothing selected in the rail', async ({
  page,
}) => {
  const project = await createProject(page, uniqueTitle('Lookups by URL'))

  await page.goto(`/projects/${project.id}/lookups`)

  await expect(
    page.getByRole('heading', { name: 'Lookup Tables' }),
  ).toBeVisible()
  // It is not in SECTIONS, so the rail shows no page as current.
  await expect(page.locator('[aria-current="page"]')).toHaveCount(0)
})

test('a project nobody has goes back to the list', async ({ page }) => {
  await page.goto('/projects/98765432/details')

  await expect(page).toHaveURL('/projects')
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
})
