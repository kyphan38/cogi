import type { FullConfig } from "@playwright/test";

/**
 * `next dev` compiles a route on its first request. With many workers starting at
 * once, that first compile can outlast a test's navigation wait, so tests failed at
 * random. Request each page once, one at a time, before any test runs.
 */
const ROUTES = [
  "/",
  "/login",
  "/reasoning",
  "/tracks",
  "/simulators",
  "/geo",
  "/forecasts",
  "/briefs",
  "/quick",
  "/terms",
  "/terms/review",
  "/handbook",
  "/settings",
  "/exercise/history",
  "/exercise/analytical",
  "/dev/layout-fixtures",
  // Compiles the 404 page, which tests for removed pages open.
  "/no-such-page",
];

export default async function globalSetup(config: FullConfig): Promise<void> {
  const base = (process.env.PLAYWRIGHT_BASE_URL ?? config.projects[0]?.use.baseURL ?? "http://localhost:3000").replace(/\/$/, "");
  for (const route of ROUTES) {
    // A failed warm-up only means the test compiles the page itself, as before.
    await fetch(`${base}${route}`, {
      // The e2e cookie lets the proxy through, as in `bypassFirebaseAuth`; without it every page is the login page.
      headers: { cookie: "cogi_e2e=1" },
      redirect: "manual",
      signal: AbortSignal.timeout(120_000),
    }).catch(() => undefined);
  }
}
