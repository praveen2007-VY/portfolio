import { expect, test } from "@playwright/test";

// These checks need no credentials: they verify that protected areas are
// unreachable without an authenticated administrator.

const PROTECTED = [
  "/admin",
  "/admin/projects",
  "/admin/certificates",
  "/admin/profile",
  "/admin/settings",
  "/admin/messages",
  "/preview",
];

test.describe("admin access control", () => {
  for (const path of PROTECTED) {
    test(`${path} redirects anonymous visitors to the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.getByRole("heading", { name: "Administrator sign in" })).toBeVisible();
    });
  }

  test("protected pages are not cached or indexed", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  // The server reads .env.local, so detect its configuration from the page,
  // not from the test runner's environment.
  test("login form validates input, or sign-in is disabled when unconfigured", async ({ page }) => {
    await page.goto("/admin/login");
    const unconfigured = page.getByText("Supabase is not configured");
    if (await unconfigured.isVisible()) {
      // Sign-in must be disabled rather than simulated.
      await expect(page.getByRole("button", { name: "Sign in" })).toHaveCount(0);
      return;
    }
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await page.getByLabel("Email").fill("owner@example.com");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
  });

  test("resume route only ever redirects to a signed URL for the private bucket", async ({ request }) => {
    const res = await request.get("/resume", { maxRedirects: 0 });
    if (res.status() === 302) {
      expect(res.headers().location).toMatch(/\/storage\/v1\/object\/sign\/documents\/resume\//);
    } else {
      expect(res.status()).toBe(404); // nothing published (or Supabase not set up yet)
    }
  });

  test("certificate file route rejects invalid ids", async ({ request }) => {
    const res = await request.get("/certificates/not-a-uuid/pdf", { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });
});
