import { apiWrite, DEMO, expect, readyProject, signIn, submitBudget, test } from './fixtures'

test("the register finds anyone's costing, read-only, and the log has its submission (#71, #72)", async ({
  page,
}) => {
  // A researcher's costing, submitted: nothing the admin made.
  const project = await readyProject(page, 'Register')
  const { title } = project
  await submitBudget(page, project.budget_id)

  await signIn(page, 'admin')
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible()
  await expect(page.getByText('Projects by status')).toBeVisible()

  const rail = page.getByRole('navigation', { name: 'Admin sections' })
  await rail.getByRole('button', { name: 'Project register' }).click()
  await page.getByPlaceholder('Search').fill(title)
  const row = page.getByRole('row').filter({ hasText: title })
  await expect(row).toContainText(DEMO.researcher)
  await expect(row).toContainText('HoD review')

  await row.getByRole('button', { name: title }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/details`)
  await expect(page.getByText('This costing is with the Head of Department, so it is read-only.')).toBeVisible()
  await page.locator('header').getByRole('button', { name: 'Project register' }).click()
  await expect(page).toHaveURL('/admin/projects')

  // The submission is in the log, found through a filter built from the log.
  await rail.getByRole('button', { name: 'Audit log' }).click()
  await page.getByRole('combobox', { name: 'Action' }).click()
  await page.getByRole('option', { name: 'budget.submit' }).click()
  await expect(
    page.getByRole('row').filter({ hasText: `budget #${project.budget_id}` }),
  ).toContainText(DEMO.researcher)
})

test('deactivating someone asks first, and the row says so afterwards (#69)', async ({ page }) => {
  await signIn(page, 'admin')
  const email = `deactivate-${Date.now()}@unimelb.edu.au`
  await apiWrite(page, 'post', '/api/admin/users/', {
    status: 201,
    data: { email, first_name: 'Dee', last_name: 'Activate', password: 'demo12345', groups: ['researcher'] },
  })

  await page.goto('/admin/users')
  await page.getByLabel('Search accounts').fill(email)
  await page.getByRole('button', { name: new RegExp(email) }).click()

  // Nothing happens until it is confirmed, and Cancel leaves it active.
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Deactivate Dee Activate?')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('Deactivated', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Deactivate', exact: true }).click()
  await page.getByRole('alert').getByRole('button', { name: 'Deactivate' }).click()
  await expect(page.getByText('Deactivated', { exact: true })).toBeVisible()

  // Giving access back needs no confirm.
  await page.getByRole('button', { name: 'Reactivate' }).click()
  await expect(page.getByText('Deactivated', { exact: true })).toHaveCount(0)
})

test('a costing waiting on a role nobody holds is shown to RIC and named to its owner (#121)', async ({ page }) => {
  // A department of this test's own, with no head of department.
  await signIn(page, 'admin')
  const code = `E2E${Date.now().toString(36).toUpperCase()}`.slice(0, 20)
  const lookups = await (await page.request.get('/api/lookups/')).json()
  await apiWrite(page, 'post', '/api/admin/lookups/departments/', {
    status: 201,
    data: {
      values: {
        code,
        name: `Unheaded ${code}`,
        school: 'School of Testing',
        school_code: 'SCH',
        budget_unit: '',
        faculty_code: lookups.faculties[0].code,
      },
    },
  })

  // A researcher submits a costing from it.
  await signIn(page)
  const project = await readyProject(page, 'Stranded', code)
  const { title } = project
  await submitBudget(page, project.budget_id)

  // Its owner is told which unit is missing an approver.
  await page.goto(`/projects/${project.id}/approvals`)
  await expect(page.getByText(`Unheaded ${code} has no head of department assigned`)).toBeVisible()

  // RIC sees it on the console, and the department is flagged on its tab.
  await signIn(page, 'admin')
  await page.goto('/admin')
  await expect(page.getByRole('row').filter({ hasText: title })).toContainText(
    `Unheaded ${code} has no head of department`,
  )
  await page.goto('/admin/lookups')
  await page.getByRole('tablist', { name: 'Lookup tables' }).getByRole('tab', { name: 'Org Units', exact: true }).click()
  await page.getByRole('tab', { name: 'Departments', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search' }).fill(code)
  await expect(page.getByRole('row').filter({ hasText: code })).toContainText('Unassigned')
})

test('a head of department is found by searching, not scrolling (#69)', async ({ page }) => {
  await signIn(page, 'admin')
  const code = `E2E${Date.now().toString(36).toUpperCase()}`.slice(0, 20)
  const name = `Searchable ${code}`
  const lookups = await (await page.request.get('/api/lookups/')).json()
  await apiWrite(page, 'post', '/api/admin/lookups/departments/', {
    status: 201,
    data: {
      values: {
        code,
        name,
        school: 'School of Testing',
        school_code: 'SCH',
        budget_unit: '',
        faculty_code: lookups.faculties[0].code,
      },
    },
  })
  const email = `searcher-${Date.now()}@unimelb.edu.au`
  await apiWrite(page, 'post', '/api/admin/users/', {
    status: 201,
    data: { email, first_name: 'Sam', last_name: 'Searcher', password: 'demo12345', groups: ['staff'] },
  })

  await page.goto('/admin/users')
  await page.getByLabel('Search accounts').fill(email)
  await page.getByRole('button', { name: new RegExp(email) }).click()

  await page.getByRole('combobox', { name: 'Department' }).click()
  const box = page.getByRole('combobox', { name: 'Search' })

  // Nothing is offered until three letters are in.
  await box.fill('se')
  await expect(page.getByText('Start typing to search.')).toBeVisible()
  await expect(page.getByRole('option')).toHaveCount(0)

  await box.fill(name)
  await page.getByRole('option', { name: new RegExp(name) }).click()
  await expect(page.getByRole('combobox', { name: 'Department' })).toHaveText(name)

  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(`Head of Department, ${name}`)).toBeVisible()
})

test('a researcher cannot be given anything to approve (#69)', async ({ page }) => {
  await signIn(page, 'admin')
  const email = `researcher-${Date.now()}@unimelb.edu.au`
  await apiWrite(page, 'post', '/api/admin/users/', {
    status: 201,
    data: { email, first_name: 'Rae', last_name: 'Searcher', password: 'demo12345', groups: ['researcher'] },
  })

  await page.goto('/admin/users')
  await page.getByLabel('Search accounts').fill(email)
  await page.getByRole('button', { name: new RegExp(email) }).click()

  await expect(page.getByText('A researcher cannot approve for a unit.')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Department' })).toHaveCount(0)

  // Moved to staff, the form is back.
  await page.getByRole('checkbox', { name: 'researcher' }).click()
  await page.getByRole('checkbox', { name: 'staff' }).click()
  await expect(page.getByRole('combobox', { name: 'Department' })).toBeVisible()
})
