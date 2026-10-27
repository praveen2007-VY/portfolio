import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * The headless test browser renders WebGL in software (SwiftShader), which the
 * showcase deliberately treats as "no capable GPU". To exercise the 3D gallery
 * we report a hardware renderer and a capable device before any page script
 * runs. The scene itself still renders through SwiftShader.
 */
async function pretendCapableGpu(context: BrowserContext) {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    for (const Ctx of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = Ctx.prototype.getParameter;
      Ctx.prototype.getParameter = function (this: WebGLRenderingContext, param: number) {
        return param === 0x9246 ? "ANGLE (Test GPU)" : original.call(this, param);
      } as typeof original;
    }
  });
}

type SceneState = {
  yaw: number;
  pitch: number;
  selected: number | null;
  offsets: [number, number][];
  cards: ([number, number] | null)[];
};

const section = (page: Page) => page.locator("#projects");
const stage = (page: Page) => page.getByTestId("gallery-stage");
const rail = (page: Page) => section(page).getByRole("group", { name: "Projects" }).getByRole("button");
const details = (page: Page) => page.getByTestId("gallery-details");

async function sceneState(page: Page): Promise<SceneState> {
  const raw = await stage(page).getAttribute("data-scene-state");
  return JSON.parse(raw ?? "null") as SceneState;
}

/** Scrolls to a point in the pinned track (0–1) and waits for the scene to report state. */
async function openGallery(page: Page, progress = 0.5) {
  await page.goto("/");
  await expect(section(page)).toHaveAttribute("data-showcase-mode", "gallery", { timeout: 20_000 });
  await page.evaluate((p) => {
    const track = document.querySelector('[data-testid="gallery-stage"]')!.parentElement!;
    const top = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + p * (track.offsetHeight - window.innerHeight), behavior: "instant" });
  }, progress);
  await expect(page.getByTestId("gallery-canvas").locator("canvas")).toBeAttached({ timeout: 30_000 });
  await expect
    .poll(async () => (await sceneState(page))?.cards?.every(Boolean) ?? false, { timeout: 30_000 })
    .toBe(true);
  await page.waitForTimeout(1500); // let the camera settle
}

/** A point on the floor below the cards (empty scene space). */
async function emptySpace(page: Page) {
  const box = (await stage(page).boundingBox())!;
  return { x: box.x + box.width * 0.5, y: box.y + box.height * 0.8 };
}

async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 8 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
  await page.mouse.up();
}

test.describe("project gallery — desktop 3D", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");
  test.setTimeout(120_000);
  test.beforeEach(async ({ context }) => pretendCapableGpu(context));

  test("shows every published project as a card in one 3D scene", async ({ page }) => {
    await openGallery(page);
    const count = await rail(page).count();
    expect(count).toBeGreaterThan(0);
    const state = await sceneState(page);
    expect(state.cards).toHaveLength(count);
    expect(state.offsets).toHaveLength(count);
    // Cards are spread across the stage rather than stacked in one place.
    const xs = state.cards.map((c) => c![0]);
    if (count > 1) expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(200);
    await expect(section(page).getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("clicking a card selects it and opens accessible details; Escape closes", async ({ page }) => {
    await openGallery(page);
    const titles = await rail(page).evaluateAll((els) =>
      els.map((el) => el.textContent?.replace(/^\d+/, "").trim() ?? ""),
    );
    const [x, y] = (await sceneState(page)).cards[0]!;
    await page.mouse.click(x, y);
    await expect.poll(async () => (await sceneState(page)).selected).toBe(0);
    await expect(details(page).getByRole("heading", { level: 3 })).toHaveText(titles[0]);
    await expect(details(page).getByRole("link", { name: "View details" })).toHaveAttribute(
      "href",
      /\/projects\/[a-z0-9-]+$/,
    );
    await expect(rail(page).first()).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("Escape");
    await expect(details(page)).toHaveCount(0);
    await expect.poll(async () => (await sceneState(page)).selected).toBeNull();
  });

  test("dragging empty space rotates the gallery; dragging a card moves only that card; reset restores", async ({
    page,
  }) => {
    await openGallery(page);

    await drag(page, await emptySpace(page), 260, -20);
    await expect.poll(async () => Math.abs((await sceneState(page)).yaw)).toBeGreaterThan(0.2);
    expect((await sceneState(page)).selected).toBeNull();

    const before = await sceneState(page);
    const target = before.cards.length > 1 ? 1 : 0;
    const [cx, cy] = before.cards[target]!;
    await drag(page, { x: cx, y: cy }, 140, -90);
    await expect.poll(async () => Math.abs((await sceneState(page)).offsets[target][0])).toBeGreaterThan(0.2);
    const after = await sceneState(page);
    expect(after.selected, "a drag must not select the card").toBeNull();
    for (const [i, [ox, oy]] of after.offsets.entries()) {
      expect(Math.abs(ox)).toBeLessThanOrEqual(1.6);
      expect(Math.abs(oy)).toBeLessThanOrEqual(1.0);
      if (i !== target) expect([ox, oy]).toEqual([0, 0]);
    }

    // Dragging far beyond the limit is clamped.
    await page.waitForTimeout(800);
    const [fx, fy] = (await sceneState(page)).cards[target]!;
    await drag(page, { x: fx, y: fy }, 900, -600);
    const clamped = await sceneState(page);
    expect(Math.abs(clamped.offsets[target][0])).toBeLessThanOrEqual(1.6);
    expect(Math.abs(clamped.offsets[target][1])).toBeLessThanOrEqual(1.0);

    await section(page).getByRole("button", { name: "Reset view" }).click();
    await expect
      .poll(async () => {
        const s = await sceneState(page);
        return s.yaw === 0 && s.pitch === 0 && s.offsets.every(([a, b]) => a === 0 && b === 0);
      })
      .toBe(true);
  });

  test("the project list and arrow keys select projects", async ({ page }) => {
    await openGallery(page);
    const count = await rail(page).count();
    await rail(page).nth(count - 1).click();
    await expect.poll(async () => (await sceneState(page)).selected).toBe(count - 1);
    await expect(details(page)).toBeVisible();

    await stage(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await sceneState(page)).selected).toBe(0);
    await details(page).getByRole("button", { name: "Close project details" }).click();
    await expect(details(page)).toHaveCount(0);
  });

  test("normal page scrolling continues through and past the scene", async ({ page }) => {
    await openGallery(page, 0.3);
    const startY = await page.evaluate(() => window.scrollY);
    const { x, y } = await emptySpace(page);
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(startY + 300);

    await page.evaluate(() => {
      const el = document.getElementById("projects")!;
      window.scrollTo({ top: el.getBoundingClientRect().bottom + window.scrollY, behavior: "instant" });
    });
    await expect(page.locator("#certificates h2")).toBeInViewport({ timeout: 10_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe("project gallery — phone", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only");
  test.setTimeout(120_000);

  test("compact 3D gallery: tap selects a card and vertical scrolling stays with the page", async ({
    context,
    page,
  }) => {
    await pretendCapableGpu(context);
    await openGallery(page);
    expect(await stage(page).evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y");
    const [x, y] = (await sceneState(page)).cards[0]!;
    await page.touchscreen.tap(x, y);
    await expect.poll(async () => (await sceneState(page)).selected).toBe(0);
    await expect(details(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("without a capable GPU, a swipeable carousel is shown", async ({ page }) => {
    await page.goto("/");
    const carousel = section(page).locator('[data-showcase-mode="carousel"]');
    await expect(carousel).toBeVisible({ timeout: 20_000 });
    await carousel.scrollIntoViewIfNeeded();
    const dots = section(page).getByRole("group", { name: "Choose a project" }).getByRole("button");
    await dots.nth(1).click();
    await expect(section(page).getByTestId("showcase-counter")).toHaveText(/^02 \//, { timeout: 10_000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe("project gallery — reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("shows simple stacked cards, even with a capable GPU", async ({ context, page, isMobile }) => {
    test.skip(isMobile, "desktop viewport");
    await pretendCapableGpu(context);
    await page.goto("/");
    await page.locator("a[data-ready]").first().waitFor({ state: "attached", timeout: 20_000 });
    const list = section(page).locator('[data-showcase-mode="list"]');
    await expect(list).toBeVisible();
    await expect(page.getByTestId("gallery-canvas")).toHaveCount(0);
    expect(await list.getByRole("heading", { level: 3 }).count()).toBeGreaterThan(0);
  });
});

test("without a hardware-accelerated GPU the desktop shows stacked cards", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop viewport");
  await page.goto("/");
  await page.locator("a[data-ready]").first().waitFor({ state: "attached", timeout: 20_000 });
  await expect(section(page).locator('[data-showcase-mode="list"]')).toBeVisible();
  await expect(page.getByTestId("gallery-canvas")).toHaveCount(0);
});
