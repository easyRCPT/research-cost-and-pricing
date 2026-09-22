import { test, expect, createProject, uniqueTitle, DEMO, signIn } from './fixtures'

/** These are about signing in, so they start signed out. */
test.use({ signedIn: false })

test('a private screen sends a signed-out visitor to login, and returns them after', async ({
  page,
  request,
}) => {
  // A screen deep in the costing flow, so "returns them after" means the screen
  // they asked for and not merely somewhere signed in.
  const project = await createProject(request, uniqueTitle('Deep link auth'))
  await page.goto(`/projects/${project.id}/staff`)
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email').fill(DEMO.researcher)
  await page.getByLabel('Password').fill(DEMO.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(`/projects/${project.id}/staff`)
  await expect(page.getByRole('heading', { name: 'Staff Costs' })).toBeVisible()
})

test('signup puts each complaint on the field it is about', async ({
  page,
}) => {
  await page.goto('/signup')

  // An address that already has an account: the server answers with the field
  // name, and it belongs under that field rather than at the top of the form.
  await page.getByLabel('First name').fill('Already')
  await page.getByLabel('Last name').fill('Registered')
  await page.getByLabel('Email').fill(DEMO.researcher)
  await page.getByLabel('Password').fill('a-perfectly-ordinary-password')
  await page.getByRole('button', { name: 'Create account' }).click()

  const emailError = page.locator('#email-error')
  await expect(emailError).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/signup/)
})

test('the wrong door is refused, and says no more than a wrong password would', async ({
  page,
}) => {
  await page.goto('/login')
  // A researcher, on the Staff tab.
  await page.getByRole('tab', { name: 'Staff' }).click()
  await page.getByLabel('Email').fill(DEMO.researcher)
  await page.getByLabel('Password').fill(DEMO.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  const wrongDoor = page.getByRole('alert')
  await expect(wrongDoor).toBeVisible()
  await expect(page).toHaveURL(/\/login/)

  // The same message a wrong password gets, so neither tells which it was.
  await page.reload()
  await page.getByLabel('Email').fill(DEMO.researcher)
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText(await wrongDoor.innerText())
})

test('the admin door has no tabs and refuses an ordinary account', async ({
  page,
}) => {
  await page.goto('/admin/login')

  await expect(page.getByRole('tab')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Create one' })).toHaveCount(0)

  await page.getByLabel('Email').fill(DEMO.researcher)
  await page.getByLabel('Password').fill(DEMO.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('a superadmin is admitted at the admin door', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(DEMO.admin)
  await page.getByLabel('Password').fill(DEMO.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL('/projects')
})

test('signing out ends the session', async ({ page }) => {
  await signIn(page)
  await page.goto('/projects')
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)

  // Not history: signing out replaces the entry, so there is nothing behind it
  // to go back to. Asking for the screen again is what proves the session is
  // gone rather than merely navigated away from.
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login/)
})

test('a write from a signed-in session carries the CSRF header', async ({
  page,
  request,
}) => {
  // Its own project: the list may be empty, and another spec's rows are not
  // this spec's to edit.
  const project = await createProject(request, uniqueTitle('CSRF'))
  await signIn(page)

  const writes: number[] = []
  page.on('response', (r) => {
    if (r.request().method() === 'PATCH') writes.push(r.status())
  })

  await page.goto(`/projects/${project.id}/details`)
  await page.getByRole('heading', { name: 'Project Details' }).waitFor()

  const title = page.getByLabel('Project title')
  await title.fill(`${await title.inputValue()} edited`)
  await title.blur()

  // Without the header Django answers 403, so any success is the header
  // arriving. Which 2xx it is belongs to the endpoint, not to this.
  await expect
    .poll(() => writes.filter((status) => status < 300).length)
    .toBeGreaterThan(0)
  expect(writes).not.toContain(403)
})
