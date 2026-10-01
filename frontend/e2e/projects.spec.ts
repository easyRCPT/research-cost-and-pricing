import {
  createProject,
  expect,
  openProject,
  test,
  uniqueTitle,
} from './fixtures'

test('the projects list shows a project and opens it', async ({ page }) => {
  const title = uniqueTitle('Genomic surveillance')
  await createProject(page, title)

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: title, exact: true }),
  ).toBeVisible()

  await openProject(page, title)
  await expect(page.getByLabel('Project title')).toHaveValue(title)
})

test('a new project opens on Project Details with costing locked', async ({
  page,
}) => {
  const title = uniqueTitle('Started from the button')

  await page.goto('/')
  await page.getByRole('button', { name: 'New project' }).click()

  await expect(
    page.getByRole('heading', { name: 'Project Details' }),
  ).toBeVisible()
  const staffCosts = page
    .getByRole('navigation', { name: 'Costing sections' })
    .getByRole('button', { name: 'Staff Costs', exact: true })
  await expect(staffCosts).toBeDisabled()

  await page.getByLabel('Project title').fill(title)
  await page.getByRole('combobox', { name: 'Department' }).click()
  await page.getByRole('combobox', { name: 'Search' }).fill('Computing')
  await page.getByRole('option').first().click()
  await page.getByRole('combobox', { name: 'End year' }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('combobox', { name: 'End month' }).click()
  await page.getByRole('option').last().click()

  await expect(staffCosts).toBeEnabled()
})
