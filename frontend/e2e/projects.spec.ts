import {
  test,
  expect,
  createProject,
  openProject,
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

test('a new project can be started from the screen', async ({ page }) => {
  const title = uniqueTitle('Started from the form')

  await page.goto('/')
  await page.getByRole('button', { name: 'New project' }).click()

  await page.getByLabel('Project title').fill(title)
  await page.getByRole('combobox').first().click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: 'Create and open' }).click()

  // Creating one lands in its editor rather than back on the list.
  await expect(
    page.getByRole('heading', { name: 'Project Details' }),
  ).toBeVisible()
  await expect(page.getByLabel('Project title')).toHaveValue(title)
})
