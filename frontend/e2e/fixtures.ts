import { test as base, expect, type Locator, type Page } from '@playwright/test'

export interface Project {
  id: number
  title: string
  budget_id: number
}

/**
 * A project of this test's own, made through the API.
 *
 * Through the API rather than the New project form because a spec that is not
 * about creating projects should not break when that form changes, and because
 * every spec needs one: made in parallel they would otherwise contend over the
 * same rows.
 */
export async function createProject(
  page: Page,
  title: string,
  years: { start: number; end: number } = { start: 2026, end: 2028 },
  /** A specific one, when an approver has to be able to reach it. */
  department?: string,
): Promise<Project> {
  if (!department) {
    const lookups = await (await page.request.get('/api/lookups/')).json()
    department = lookups.departments[0].code as string
  }

  const response = await apiWrite(page, 'post', '/api/projects/', {
    status: 201,
    data: {
      title,
      department,
      start_year: years.start,
      start_month: 1,
      end_year: years.end,
      end_month: 12,
    },
  })
  return response.json()
}

/** Opens a project from the list, by the title it was given. */
export async function openProject(page: Page, title: string) {
  await page.goto('/')
  await page.getByRole('button', { name: title, exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Project Details' }),
  ).toBeVisible()
}

/**
 * Moves between the costing screens using the rail, as a person would.
 *
 * Exact names throughout: "Staff Costs" is a substring of "Non-Staff Costs",
 * and the heading carries the same word as the rail item.
 */
export async function goToScreen(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: 'Costing sections' })
    .getByRole('button', { name: label, exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: label, exact: true }),
  ).toBeVisible()
}

interface StaffRowFields {
  name: string
  employment?: string
  category?: string
  classification?: string
  basis?: string
}

/** A new single-year project open on Staff Costs, with its first row filled in. Returns that row. */
export async function newStaffRow(page: Page, what: string, fields: StaffRowFields) {
  const title = uniqueTitle(what)
  await createProject(page, title, { start: 2026, end: 2026 })
  await openProject(page, title)
  await goToScreen(page, 'Staff Costs')
  const row = page.locator('tbody tr').first()
  await fillStaffRow(page, row, fields)
  return row
}

/**
 * Fills the four choices that make a staff row real enough to price.
 *
 * By position rather than by looking for an empty cell: picking an employment
 * type narrows the time bases and selects the first of them, so the basis is
 * never blank by the time it is reached.
 */
async function fillStaffRow(
  page: Page,
  row: Locator,
  {
    name,
    employment = 'Continuing',
    category = 'Academic',
    classification = 'Level A.1',
    basis = 'FTE',
  }: StaffRowFields,
) {
  await row.getByRole('textbox').first().fill(name)

  const choices = [employment, category, classification, basis]
  for (const [index, value] of choices.entries()) {
    await chooseOption(page, row.getByRole('combobox').nth(index), value)
  }
}

/**
 * Open one select and pick a value, retrying the open.
 *
 * The click that opens a select is sometimes swallowed: each choice patches the
 * budget, and the re-render on the reply can land between Playwright deciding
 * the trigger is actionable and the click arriving. The option then never
 * appears and the wait runs to the full test timeout, which is what made this
 * the flakiest line in the suite.
 *
 * Retrying needs the guard: a select that did open toggles shut on a second
 * click, so the listbox is checked before pressing again.
 */
async function chooseOption(page: Page, trigger: Locator, value: string) {
  const option = page.getByRole('option', { name: value, exact: true })

  await expect(async () => {
    if (!(await page.getByRole('listbox').isVisible())) {
      await trigger.click()
    }
    await expect(option).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })

  await option.click()
  // Gone before the next one is asked for, so `listbox` above is this row's
  // next select and never the one just used.
  await expect(option).toBeHidden()
}

/** A title nothing else will collide with, so specs can run in parallel. */
export const uniqueTitle = (what: string) =>
  `${what} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`

async function csrfToken(page: Page) {
  const cookies = await page.context().cookies()
  return cookies.find((c) => c.name === 'csrftoken')?.value ?? ''
}

/** A write through the API with the CSRF header. Fails the test unless it answers `status`, or any 2xx when none is given. */
export async function apiWrite(
  page: Page,
  method: 'post' | 'patch',
  url: string,
  { status, data }: { status?: number; data?: object } = {},
) {
  const response = await page.request[method](url, {
    headers: { 'X-CSRFToken': await csrfToken(page) },
    data,
  })
  const body = await response.text()
  if (status) expect(response.status(), body).toBe(status)
  else expect(response.ok(), body).toBe(true)
  return response
}

/** A single-year project in the HoD's department, with everything submission checks for. */
export async function readyProject(page: Page, what: string): Promise<Project> {
  const project = await createProject(
    page,
    uniqueTitle(what),
    { start: 2026, end: 2026 },
    DEMO.hodDepartment,
  )
  const budget = `/api/budgets/${project.budget_id}/`
  for (const [field, value] of [
    ['chief_investigator', 'Dr Ruth Researcher'],
    ['funder', 'Australian Research Council'],
  ]) {
    await apiWrite(page, 'patch', budget, {
      data: { section: 'project', field, value },
    })
  }
  await apiWrite(page, 'post', `${budget}staff-lines/`, {
    status: 201,
    data: {
      name_role: 'Dr Chen',
      employment_type: 'Continuing',
      category: 'Academic',
      classification: 'Level A.1',
      time_basis: 'FTE',
      in_kind: false,
      in_kind_reason: '',
      allocations: [{ year: 2026, time: 0.5 }],
    },
  })
  return project
}

/** Submits a budget for approval as whoever is signed in. */
export async function submitBudget(page: Page, budgetId: number) {
  await apiWrite(page, 'post', `/api/budgets/${budgetId}/submit/`, { status: 200 })
}

export const DEMO = {
  // The department create_demo_users makes hod@ head of.
  hodDepartment: 'CCH_H1_5_39',
  researcher: 'researcher@unimelb.edu.au',
  hod: 'hod@unimelb.edu.au',
  dean: 'dean@unimelb.edu.au',
  admin: 'admin@unimelb.edu.au',
  password: 'demo1234',
}

const ACCOUNTS = {
  researcher: { email: DEMO.researcher, door: '/api/auth/login/', account_type: 'researcher' },
  hod: { email: DEMO.hod, door: '/api/auth/login/', account_type: 'staff' },
  // The admin door has no tabs, so it takes no account type.
  admin: { email: DEMO.admin, door: '/api/auth/admin-login/', account_type: undefined },
}

/**
 * Put a session in the browser, without going through the form.
 *
 * Through the page's own origin, not the API's: the proxy makes them the same
 * site, which is what lets the browser keep the cookie at all. Signing in by
 * API keeps a spec that is not about signing in from breaking when the login
 * screen changes, and from spending a form fill on every test.
 */
export async function signIn(page: Page, role: keyof typeof ACCOUNTS = 'researcher') {
  const { email, door, account_type } = ACCOUNTS[role]
  await page.context().clearCookies()
  const csrf = await page.request.get('/api/auth/csrf/')
  expect(csrf.status(), await csrf.text()).toBe(204)

  const response = await page.request.post(door, {
    headers: { 'X-CSRFToken': await csrfToken(page) },
    data: { email, password: DEMO.password, account_type },
  })
  // A 401 here is almost always a database without the demo accounts rather
  // than anything the test did, and it fails every signed-in spec at once, so
  // say which command fixes it instead of leaving 16 red lines to interpret.
  expect(
    response.status(),
    `Could not sign in as ${email}. If this is a fresh database, run: make demo-users\n${await response.text()}`,
  ).toBe(200)
}

/**
 * Every spec starts signed in.
 *
 * Since #44 the screens are behind a guard, so a spec that just navigates
 * would land on the login page instead. The three auth specs opt out with
 * `test.use({ signedIn: false })`.
 */
export const test = base.extend<{ signedIn: boolean }>({
  signedIn: [true, { option: true }],
  page: async ({ page, signedIn }, use) => {
    if (signedIn) await signIn(page)
    await use(page)
  },
})

export { expect }
