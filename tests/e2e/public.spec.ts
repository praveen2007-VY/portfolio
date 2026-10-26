import { expect, test } from "@playwright/test";

test.describe("public portfolio", () => {
  test("renders every section without console errors or horizontal overflow", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Building Intelligent Experiences");

    for (const id of ["about", "experience", "skills", "projects", "certificates", "achievements", "coding", "contact"]) {
      const section = page.locator(`section#${id}`);
      await section.scrollIntoViewIfNeeded();
      await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Sign Aura" })).toBeVisible();
    await expect(page.getByText("DevOps with AWS Intern")).toBeVisible();
    await expect(page.getByText("Programming in Java")).toBeVisible();
    await expect(page.getByText("Rank 6", { exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test("navigation links scroll to their sections", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.locator("header").getByRole("link", { name: "Projects" }).last().click();
    } else {
      await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Projects" }).click();
    }
    await expect(page).toHaveURL(/#projects$/);
    await expect(page.locator("#projects h2")).toBeInViewport();
  });

  test("mobile menu is accessible and closes with Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  });

  test("certificate filters narrow the gallery", async ({ page }) => {
    await page.goto("/#certificates");
    const gallery = page.locator("#certificates");
    await gallery.getByRole("button", { name: /^Cloud/ }).click();
    await expect(gallery.getByRole("heading", { name: "Cloud Computing" })).toBeVisible();
    await expect(gallery.getByRole("heading", { name: "Programming in Java" })).toHaveCount(0);
  });

  test("project detail page renders and missing projects 404", async ({ page }) => {
    await page.goto("/projects/sign-aura");
    await expect(page.getByRole("heading", { level: 1, name: "Sign Aura" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Key features" })).toBeVisible();

    // The first on-demand render may stream (200); it must still be marked noindex.
    const res = await page.goto("/projects/does-not-exist");
    expect([200, 404]).toContain(res?.status());
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });

  test("private contact details stay hidden by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toContainText("9965293440");
  });
});

test.describe("hidden admin entry", () => {
  test("five quick logo clicks open the admin login", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a[data-ready]").first()).toBeAttached({ timeout: 20_000 }); // hydrated
    // One rapid burst of five real clicks (detail 1..5). Issuing them as separate
    // mouse.click calls lets a loaded test runner space them seconds apart.
    await page.getByRole("link", { name: /back to top/ }).click({ clickCount: 5 });
    // The URL updates once the server responds with the login page; allow for a loaded CI machine.
    await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Administrator sign in" })).toBeVisible();
  });

  test("a single click keeps normal logo navigation", async ({ page }) => {
    await page.goto("/#contact");
    await page.getByRole("link", { name: /back to top/ }).click();
    await expect(page).toHaveURL(/\/#top$/);
  });

  test("slow clicks do not open the login page", async ({ page }) => {
    test.setTimeout(90_000); // five real clicks with pauses; slow on loaded machines
    await page.goto("/");
    const logo = page.getByRole("link", { name: /back to top/ });
    for (let i = 0; i < 5; i++) {
      await logo.click();
      await page.waitForTimeout(800);
    }
    await expect(page).not.toHaveURL(/admin/);
  });

  test("keyboard activation is not counted", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop only");
    await page.goto("/");
    const logo = page.getByRole("link", { name: /back to top/ });
    await logo.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/admin/);
  });
});
