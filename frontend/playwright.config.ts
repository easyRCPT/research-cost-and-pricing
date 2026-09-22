import { defineConfig, devices } from '@playwright/test'

/**
 * End to end, against the real stack.
 *
 * The app cannot do anything without the API -- the projects list is a
 * GET /api/projects/ on first paint -- so both servers are started here rather
 * than assumed. Locally they are reused if they are already up; in CI they are
 * always started fresh.
 *
 * The base URL is localhost and not 127.0.0.1 on purpose: Django's
 * CORS_ALLOWED_ORIGINS holds the localhost spelling, and a browser treats the
 * two as different origins.
 */
const PORT = 5173
const API = 'http://127.0.0.1:8000'

export default defineConfig({
  testDir: './e2e',
  // Every spec makes its own project, so they do not contend.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Two everywhere, not "CI is constrained, a laptop is not". Every worker
  // shares one Django dev server, and a cold load pulls the lookups and the
  // project list before it can paint. Past two workers those queue: at eight,
  // two to four specs a run die with the loading skeleton still on screen,
  // having spent the whole assertion timeout waiting for a heading. Which
  // specs fail moves around, because it is the server and not any one of them.
  //
  // It costs nothing to cap it. The suite takes about 30s either way, since
  // what it waits on is that server rather than the number of workers.
  workers: 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    // Kept only for a failure, which is when anyone wants them.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'uv run python manage.py runserver 8000',
      cwd: '../backend',
      url: `${API}/api/lookups/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // The built bundle rather than the dev server: it is what ships, and
      // StrictMode's double render is a development-only behaviour.
      //
      // Never reused, unlike Django. `vite preview` serves whatever dist/ held
      // when it started, so a reused one silently tests the previous build
      // after any source change. The build is about a second; a suite that
      // sometimes checks yesterday's bundle is worth less than that.
      command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
