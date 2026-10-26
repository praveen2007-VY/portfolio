import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end CMS workflows against a real Supabase project.
 *
 * Requires a configured app (NEXT_PUBLIC_SUPABASE_* set at build time) and:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD        an allowlisted administrator
 *   E2E_NONADMIN_EMAIL / E2E_NONADMIN_PASSWORD  (optional) a user NOT in admin_users
 *
 * Use a staging project: these tests create, publish and delete content.
 */
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const nonAdmin = { email: process.env.E2E_NONADMIN_EMAIL, password: process.env.E2E_NONADMIN_PASSWORD };

test.describe.configure({ mode: "serial" });
test.skip(!admin.email || !admin.password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run CMS workflows");
test.skip(({ isMobile }) => isMobile, "Workflows run once, on desktop");

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const stamp = Date.now().toString(36);
const slug = `e2e-project-${stamp}`;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("rejects wrong passwords", async ({ page }) => {
  await signIn(page, admin.email!, "definitely-wrong-password");
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("rejects authenticated users who are not administrators", async ({ page }) => {
  test.skip(!nonAdmin.email || !nonAdmin.password, "Set E2E_NONADMIN_* to run");
  await signIn(page, nonAdmin.email!, nonAdmin.password!);
  await expect(page.getByText("This account does not have administrator access.")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("draft projects stay hidden until published, then appear publicly", async ({ page }) => {
  await signIn(page, admin.email!, admin.password!);
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/projects");
  await page.getByRole("button", { name: "New project" }).first().click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Title").fill(`E2E Project ${stamp}`);
  await expect(editor.getByLabel("URL slug")).toHaveValue(slug);
  await editor.getByLabel("Short summary").fill("Created by the end-to-end test suite.");
  await editor.locator('input[type="file"]').first().setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
  await expect(editor.getByText("New file ready")).toBeVisible();
  await editor.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Project saved as draft.")).toBeVisible();

  const publicRes = await page.request.get(`/projects/${slug}`);
  expect(publicRes.status()).toBe(404);
  const home = await page.request.get("/");
  expect(await home.text()).not.toContain(`E2E Project ${stamp}`);

  // Preview shows the draft to the admin.
  await page.goto(`/preview/projects/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: `E2E Project ${stamp}` })).toBeVisible();

  // Publish via the list toggle.
  await page.goto("/admin/projects");
  const row = page.locator("li", { hasText: `E2E Project ${stamp}` });
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published.")).toBeVisible();

  await expect
    .poll(async () => (await page.request.get(`/projects/${slug}`)).status(), { timeout: 15_000 })
    .toBe(200);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: `E2E Project ${stamp}` })).toBeVisible();

  // Edit, then delete.
  await page.goto("/admin/projects");
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill(`E2E Project ${stamp} edited`);
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Project saved and published.")).toBeVisible();

  const edited = page.locator("li", { hasText: `E2E Project ${stamp} edited` });
  await edited.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Project deleted.")).toBeVisible();
  await expect.poll(async () => (await page.request.get(`/projects/${slug}`)).status()).toBe(404);
});

test("certificates can be uploaded, replaced and removed", async ({ page }) => {
  await signIn(page, admin.email!, admin.password!);
  await page.goto("/admin/certificates");
  await page.getByRole("button", { name: "New certificate" }).first().click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Certificate title").fill(`E2E Certificate ${stamp}`);
  await editor.getByLabel("Issuing organization").fill("E2E Issuer");
  const pdfInput = editor.locator('input[type="file"][accept="application/pdf"]');
  await pdfInput.setInputFiles({ name: "cert.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(editor.getByText("New file ready")).toBeVisible();
  await editor.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Certificate saved and published.")).toBeVisible();

  const row = page.locator("li", { hasText: `E2E Certificate ${stamp}` });
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").locator('input[type="file"][accept="application/pdf"]').setInputFiles({
    name: "cert-v2.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Certificate saved and published.")).toBeVisible();

  // Wrong type is rejected in the browser before uploading.
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").locator('input[type="file"][accept="application/pdf"]').setInputFiles({
    name: "evil.html",
    mimeType: "text/html",
    buffer: Buffer.from("<script>alert(1)</script>"),
  });
  await expect(page.getByText(/Unsupported file type/)).toBeVisible();
  await page.getByRole("button", { name: "Close editor" }).click();
  const discard = page.getByRole("button", { name: "Discard" });
  if (await discard.isVisible()) await discard.click();

  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Certificate deleted.")).toBeVisible();
});

test("profile edits and resume replacement reach the public site", async ({ page }) => {
  await signIn(page, admin.email!, admin.password!);
  await page.goto("/admin/profile");
  const location = page.getByLabel("Location");
  const original = await location.inputValue();
  await location.fill(`${original} (${stamp})`);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(`(${stamp})`).first()).toBeVisible();

  await page.goto("/admin/profile");
  await page.getByLabel("Location").fill(original);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();

  await page.locator("#resume input[type=file]").setInputFiles({ name: `resume-${stamp}.pdf`, mimeType: "application/pdf", buffer: PDF });
  await page.getByRole("button", { name: "Publish this resume" }).click();
  await expect(page.getByText(/Resume published/)).toBeVisible();
  const res = await page.request.get("/resume", { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers().location).toContain(`resume-${stamp}.pdf`);
});

test("logging out ends access to the dashboard", async ({ page }) => {
  await signIn(page, admin.email!, admin.password!);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("button", { name: "Log out" }).first().click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login/);
});
