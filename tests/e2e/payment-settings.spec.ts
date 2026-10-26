import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function navigate(page: Page, path: string) {
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
async function login(page: Page, email: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta", { exact: true }).fill(email);
  await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page).not.toHaveURL(/\/giris$/);
}
for (const width of [390, 768, 1440]) {
  test(`payment settings are a disconnected ephemeral preview ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await login(page, "yonetici@example.test");
    if (width === 768)
      await page.getByRole("button", { name: "Koyu temaya geç" }).click();
    const toggle = page.locator(".mobile-nav-toggle button");
    if (await toggle.isVisible()) await toggle.click();
    await page
      .getByRole("link", { name: "Ödeme ayarları", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ödeme ayarları", exact: true }),
    ).toBeVisible();
    const mutations: string[] = [],
      errors: string[] = [];
    page.on("request", (request) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
        mutations.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    const storage = () =>
      page.evaluate(() => ({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }));
    const before = await storage();
    await expect(page.getByLabel("Bağlantı bilgileri")).toBeDisabled();
    await expect(page.getByLabel("Banka / ödeme sağlayıcısı")).toBeEmpty();
    await page.getByLabel("Banka adı", { exact: true }).fill("Örnek Banka");
    await page.getByLabel("Hesap sahibi / işletme unvanı").fill("Örnek Salon");
    await page
      .getByLabel("IBAN", { exact: true })
      .fill("TR00 0000 0000 0000 0000 0000 00");
    await page.getByRole("button", { name: "Taslağı önizle" }).click();
    await expect(page.locator(".payment-preview")).toContainText("Örnek Salon");
    await expect(page.locator(".payment-preview")).toContainText("Bağlı değil");
    expect(await storage()).toEqual(before);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/payment-settings-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Alanları temizle" }).click();
    await expect(page.getByLabel("IBAN", { exact: true })).toBeEmpty();
    await expect(page.locator(".payment-preview")).toHaveCount(0);
    await page.getByLabel("Banka adı", { exact: true }).fill("Geçici bilgi");
    await navigate(page, "/yonetim/ayarlar");
    await expect(
      page.getByRole("heading", { name: "Salon ayarları", exact: true }),
    ).toBeVisible();
    await navigate(page, "/yonetim/odeme-ayarlari");
    await expect(page.getByLabel("Banka adı", { exact: true })).toBeEmpty();
    expect(mutations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
test("staff cannot access payment settings", async ({ page }) => {
  await login(page, "berber@example.test");
  await navigate(page, "/yonetim/odeme-ayarlari");
  await expect(
    page.getByRole("heading", { name: "Erişim yetkiniz yok" }),
  ).toBeVisible();
  await expect(page.getByLabel("IBAN", { exact: true })).toHaveCount(0);
});
