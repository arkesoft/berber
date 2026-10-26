import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("network and empty states are recoverable", async ({ page }) => {
  await page.goto("/randevu");
  await expect(page.getByRole("radio", { name: /Saç kesimi/ })).toBeVisible();
  await page.locator(".demo-bar summary").click();
  await page.getByLabel("Test senaryosu").selectOption("empty");
  await expect(
    page.getByText("Henüz rezervasyona açık hizmet bulunmuyor."),
  ).toBeVisible();
  await page.getByLabel("Test senaryosu").selectOption("server-error");
  await expect(page.getByRole("alert")).toContainText("ulaşılamıyor");
  await page.getByLabel("Test senaryosu").selectOption("success");
  await expect(page.getByRole("radio", { name: /Saç kesimi/ })).toBeVisible();
});
test("dark theme, long text and keyboard controls remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/randevu");
  await expect(page.getByRole("radio", { name: /Saç kesimi/ })).toBeVisible();
  await page.getByRole("button", { name: "Koyu temaya geç" }).click();
  await page.getByRole("radio", { name: /Saç kesimi/ }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: /Saç kesimi/ })).toBeChecked();
  await page
    .locator(".choice strong")
    .first()
    .evaluate((node) => {
      node.textContent =
        "Uzun hizmet açıklaması · Persönliche Haarpflege · Réservation personnalisée";
    });
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
  await page.screenshot({
    path: "test-results/dark-mobile.png",
    fullPage: true,
  });
});
test("public page is prerendered and uses only local requests", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:4173") &&
      !request.url().startsWith("data:")
    )
      external.push(request.url());
  });
  const response = await page.goto("/");
  expect(await response!.text()).toContain("İyi bir kesim");
  await expect(page.getByRole("link", { name: /Saç kesimi/ })).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  expect(external).toEqual([]);
  const navigation = await page.evaluate(() => {
    const n = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    return {
      domContentLoadedMs: n.domContentLoadedEventEnd,
      transferBytes: n.transferSize,
      fontsLoaded: document.fonts.check('16px "Outfit Variable"'),
    };
  });
  expect(navigation.fontsLoaded).toBe(true);
  await test.info().attach("navigation-performance", {
    body: JSON.stringify(navigation),
    contentType: "application/json",
  });
});
test("manager screens have no overflow or accessibility violations", async ({
  page,
}) => {
  await page.goto("/giris");
  await page
    .getByLabel("E-posta", { exact: true })
    .fill("yonetici@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Günlük bakış" }),
  ).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
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
    await page.screenshot({
      path: `test-results/manager-${width}.png`,
      fullPage: true,
    });
  }
});
