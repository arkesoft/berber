import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 768, 1440]) {
  test(`landing imagery, navigation and accessibility ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Keskin çizgi. Kendi tarzın.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Saç kesimi/ })).toBeVisible();
    const images = page.locator('main img:not([aria-hidden="true"] img)');
    for (const img of await images.all()) {
      if (
        !(await img.evaluate((element) =>
          Boolean(element.closest(".landing-reel")),
        ))
      ) {
        await img.scrollIntoViewIfNeeded();
      }
      await expect
        .poll(() =>
          img.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByText("Randevu için üye olmalı mıyım?", { exact: true })
      .click();
    await expect(page.getByText(/Hayır. Hizmet, berber ve saat/)).toBeVisible();
    await page.screenshot({
      path: `test-results/landing-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("link", { name: /Saç kesimi/ }).click();
    await expect(page).toHaveURL(/\/randevu\?hizmet=/);
    await expect(page.getByRole("radio", { name: /Saç kesimi/ })).toBeChecked();
    expect(errors).toEqual([]);
  });
}

test("landing dark theme, keyboard and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Koyu temaya geç" }).click();
  const service = page.getByRole("link", { name: /Sakal düzenleme/ });
  await service.focus();
  await expect(service).toBeFocused();
  expect(
    await page
      .locator(".landing-reel-track")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await expect(
    page.getByRole("button", { name: "Hareketi duraklat" }),
  ).toBeHidden();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await service.press("Enter");
  await expect(page).toHaveURL(/\/randevu\?hizmet=/);
});

test("photo motion can be paused and resumed by keyboard", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  // The prerendered button exists before the client mounts and restores focus.
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  const control = page.getByRole("button", { name: "Hareketi duraklat" });
  await control.focus();
  await control.press("Enter");
  await expect(
    page.getByRole("button", { name: "Hareketi sürdür" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("heading", { level: 1 }).focus();
  await page.mouse.move(0, 0);
  const track = page.locator(".landing-reel-track");
  expect(
    await track.evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  const resume = page.getByRole("button", { name: "Hareketi sürdür" });
  await resume.focus();
  await resume.press("Enter");
  await page.getByRole("heading", { level: 1 }).focus();
  expect(
    await track.evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("running");
});
