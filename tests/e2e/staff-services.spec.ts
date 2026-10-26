import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function navigate(page: Page, path: string) {
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
for (const width of [390, 768, 1440]) {
  test(`manager assigns a new service to a specific staff member ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/giris");
    await page
      .getByLabel("E-posta", { exact: true })
      .fill("yonetici@example.test");
    await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Günlük bakış" }),
    ).toBeVisible();
    if (width === 768)
      await page.getByRole("button", { name: "Koyu temaya geç" }).click();
    await navigate(page, "/yonetim/hizmetler");
    await page.getByRole("button", { name: "Yeni kayıt ekle" }).click();
    await page.getByLabel("Ad", { exact: true }).fill("Cilt bakımı");
    await page
      .getByLabel("Açıklama", { exact: true })
      .fill("Yeni hizmet denemesi");
    await page.getByLabel("Ücret (TL)", { exact: true }).fill("500");
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.locator(".editor")).toHaveCount(0);
    await navigate(page, "/yonetim/calisanlar");
    const row = page
      .locator(".resource-row")
      .filter({ has: page.getByText("Emre Kaya", { exact: true }) });
    await row.getByRole("button", { name: "Düzenle" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Cilt bakımı", exact: true }),
    ).not.toBeChecked();
    await page
      .getByRole("checkbox", { name: "Cilt bakımı", exact: true })
      .check();
    const saved = page.waitForRequest(
      (r) => r.url().endsWith("/management") && r.method() === "PUT",
    );
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    const payload = (await saved).postDataJSON() as {
      value: { serviceIds: string[] };
    };
    expect(payload.value.serviceIds).toHaveLength(4);
    await expect(page.locator(".editor")).toHaveCount(0);
    await expect(row).toContainText("Cilt bakımı");
    await row.getByRole("button", { name: "Düzenle" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Cilt bakımı", exact: true }),
    ).toBeChecked();
    const checkboxes = page
      .getByRole("group", { name: "Verebildiği hizmetler" })
      .getByRole("checkbox");
    for (const checkbox of await checkboxes.all()) await checkbox.uncheck();
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("En az bir hizmet seçin.");
    await expect(
      page.getByRole("group", { name: "Verebildiği hizmetler" }),
    ).toBeFocused();
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
      path: `test-results/staff-services-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("checkbox", { name: "Cilt bakımı", exact: true })
      .check();
    await page.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(page.locator(".editor")).toHaveCount(0);
    await row.getByRole("button", { name: "Düzenle" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Saç kesimi", exact: true }),
    ).not.toBeChecked();
    await navigate(page, "/randevu");
    await page.getByRole("radio", { name: /Cilt bakımı/ }).check();
    await page.getByRole("button", { name: "Berber seçimine geç" }).click();
    await expect(page.getByRole("radio", { name: /Emre Kaya/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Can Demir/ })).toHaveCount(0);
  });
}
