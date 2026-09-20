import {
  test as base,
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test'

const API = 'http://127.0.0.1:8000'

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
  request: APIRequestContext,
  title: string,
  years: { start: number; end: number } = { start: 2026, end: 2028 },
): Promise<Project> {
  const lookups = await (await request.get(`${API}/api/lookups/`)).json()
  const department = lookups.departments[0].code

  const response = await request.post(`${API}/api/projects/`, {
    data: {
      title,
      department,
      start_year: years.start,
      start_month: 1,
      end_year: years.end,
      end_month: 12,
    },
  })
  expect(response.status(), await response.text()).toBe(201)
  return response.json()
}

/** Opens a project from the list, by the title it was given. */
export async function openProject(page: Page, title: string) {
  await page.goto('/')
  await page.getByRole('button', { name: title, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Project Details' })).toBeVisible()
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

/**
 * Fills the four choices that make a staff row real enough to price.
 *
 * By position rather than by looking for an empty cell: picking an employment
 * type narrows the time bases and selects the first of them, so the basis is
 * never blank by the time it is reached.
 */
export async function fillStaffRow(
  page: Page,
  row: Locator,
  {
    name,
    employment = 'Continuing',
    category = 'Academic',
    classification = 'Level A.1',
    basis = 'FTE',
  }: {
    name: string
    employment?: string
    category?: string
    classification?: string
    basis?: string
  },
) {
  await row.getByRole('textbox').first().fill(name)

  const choices = [employment, category, classification, basis]
  for (const [index, value] of choices.entries()) {
    await row.getByRole('combobox').nth(index).click()
    await page.getByRole('option', { name: value, exact: true }).click()
  }
}

/** A title nothing else will collide with, so specs can run in parallel. */
export const uniqueTitle = (what: string) =>
  `${what} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`

export const test = base
export { expect }
