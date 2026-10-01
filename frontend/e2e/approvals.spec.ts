import {
  createProject,
  DEMO,
  expect,
  readyProject,
  signIn,
  submitBudget,
  test,
  uniqueTitle,
} from './fixtures'

test('submitted, approved by the head of department, and recorded (#83, #84)', async ({
  page,
}) => {
  const project = await readyProject(page, 'Approved end to end')
  const { title } = project

  // The owner submits, and the screen shows what the server did.
  await page.goto(`/projects/${project.id}/approvals`)
  await page.getByRole('button', { name: 'Submit for approval' }).click()
  await expect(page.getByText('Awaiting Head of Department')).toBeVisible()
  await expect(page.getByText(/^Waiting on /)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toHaveCount(0)

  // The head of department opens it from their queue, into the costing itself.
  await signIn(page, 'hod')
  await page.goto('/approvals')
  await page.getByRole('link', { name: new RegExp(title) }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/approvals`)
  await expect(page.getByText('This costing is waiting on your authorisation')).toBeVisible()

  // They can read the whole calculation, and change none of it.
  await page
    .getByRole('navigation', { name: 'Costing sections' })
    .getByRole('button', { name: 'Staff Costs', exact: true })
    .click()
  await expect(page.getByRole('button', { name: /Add row/ }).first()).toBeDisabled()
  await page.getByRole('link', { name: 'Decide on the Approvals screen' }).click()

  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('No Dean is needed')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm and approve' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'You approved' }),
  ).toContainText('It is approved')
  await expect(page.getByText(/Approved\s+by Hana Head/)).toBeVisible()

  // Back in the queue, it is gone.
  await page.locator('header').getByRole('button', { name: 'Approvals' }).click()
  await expect(page).toHaveURL('/approvals')
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0)

  // The owner sees who decided.
  await signIn(page)
  await page.goto(`/projects/${project.id}/approvals`)
  await expect(page.getByText(/Approved\s+by Hana Head/)).toBeVisible()
})

test('a submitted costing is read-only on every screen', async ({ page }) => {
  const project = await readyProject(page, 'Frozen')
  await submitBudget(page, project.budget_id)

  await page.goto(`/projects/${project.id}/staff`)
  await expect(page.getByText(/so it is read-only/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Add row/ }).first()).toBeDisabled()
})

test('a costing that is not ready lists what the server wants', async ({ page }) => {
  const project = await createProject(page, uniqueTitle('Not ready'))

  await page.goto(`/projects/${project.id}/approvals`)
  await page.getByRole('button', { name: 'Submit for approval' }).click()

  await expect(page.getByText('This costing is not ready to submit yet.')).toBeVisible()
  await expect(page.getByText('Chief investigator is required.')).toBeVisible()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()
})

test('the owner withdraws a submission, it leaves the queue, and a new draft carries on (#95)', async ({
  page,
}) => {
  const project = await readyProject(page, 'Withdrawn')
  const { title } = project
  await page.goto(`/projects/${project.id}/approvals`)
  await page.getByRole('button', { name: 'Submit for approval' }).click()
  await expect(page.getByText('Awaiting Head of Department')).toBeVisible()

  // The head of department can see it, but withdrawing is the owner's alone.
  await signIn(page, 'hod')
  await page.goto(`/projects/${project.id}/approvals`)
  await expect(page.getByText('This costing is waiting on your authorisation')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Withdraw from review' })).toHaveCount(0)

  // The owner withdraws it, after a confirm that says what that means.
  await signIn(page)
  await page.goto(`/projects/${project.id}/approvals`)
  await page.getByRole('button', { name: 'Withdraw from review' }).click()
  const ask = page.getByRole('alertdialog', { name: 'Withdraw from review' })
  await expect(ask).toContainText('can’t be undone')
  await ask.getByRole('button', { name: 'Withdraw' }).click()
  await expect(page.getByText('You withdrew this costing from review.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Withdraw from review' })).toHaveCount(0)

  // It is in nobody's queue now.
  await signIn(page, 'hod')
  await page.goto('/approvals')
  await expect(page.getByRole('heading', { name: /Approvals/ }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0)

  // The owner carries on from a new draft, and the withdrawn attempt is kept.
  await signIn(page)
  await page.goto(`/projects/${project.id}/approvals`)
  await page.getByRole('button', { name: 'Make a new draft from it' }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/details`)
  await page
    .getByRole('navigation', { name: 'Costing sections' })
    .getByRole('button', { name: 'Approvals', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeVisible()
  const budgets = await (await page.request.get('/api/projects/')).json()
  const row = budgets.find((candidate: { id: number }) => candidate.id === project.id)
  expect(row.budget_count).toBe(2)
})

test("an approver's register lists their area at any status, and Back returns to it (#98)", async ({ page }) => {
  const project = await readyProject(page, 'Register')
  const { title } = project
  await submitBudget(page, project.budget_id)

  await signIn(page, 'hod')
  await page.goto('/approvals')
  await page.getByRole('navigation', { name: 'Approvals' }).getByRole('link', { name: 'Register' }).click()
  await expect(page).toHaveURL('/approvals/register')
  await page.getByPlaceholder('Search').fill(title)
  const row = page.getByRole('row').filter({ hasText: title })
  await expect(row).toContainText(DEMO.researcher)
  await expect(row).toContainText('HoD review')

  // The chips filter on the server.
  const statuses = page.getByRole('group', { name: 'Status' })
  await statuses.getByRole('button', { name: 'Approved', exact: true }).click()
  await expect(row).toHaveCount(0)
  await statuses.getByRole('button', { name: 'All', exact: true }).click()
  await expect(row).toBeVisible()

  // A row opens the whole costing, read-only, with the margin as a figure.
  await row.getByRole('button', { name: title }).click()
  await expect(page).toHaveURL(`/projects/${project.id}/details`)
  await page
    .getByRole('navigation', { name: 'Costing sections' })
    .getByRole('button', { name: 'Adjust Price', exact: true })
    .click()
  await expect(page.getByText('30.0%', { exact: true })).toBeVisible()
  await expect(page.getByRole('slider')).toHaveCount(0)

  // Back goes to the register it came from, not the queue.
  await page.locator('header').getByRole('button', { name: 'Register' }).click()
  await expect(page).toHaveURL('/approvals/register')
})
