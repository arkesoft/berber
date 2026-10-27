import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile, mkdir } from "node:fs/promises";

async function login(page: Page, email = "yonetici@example.test") {
  await page.goto("/giris");
  await page.getByLabel("E-posta", { exact: true }).fill(email);
  await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page).not.toHaveURL(/giris$/);
}
async function navigate(page: Page, path: string) {
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

for (const width of [390, 768, 1440]) {
  test(`chair editor, unsaved changes, relationships and keyboard ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await login(page);
    await navigate(page, "/yonetim/koltuklar");
    if (width === 768)
      await page.getByRole("button", { name: "Koyu temaya geç" }).click();
    const row = page
      .locator(".resource-row")
      .filter({ hasText: "Pencere yanı" });
    await row.getByRole("button", { name: "Düzenle", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Kaydı düzenle" });
    await expect(dialog).toBeVisible();
    await dialog
      .getByLabel("Koltuk kullanımı", { exact: true })
      .selectOption("emre");
    await page.keyboard.press("Escape");
    await expect(
      dialog.getByText(/Kaydedilmemiş değişiklikler var/),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Düzenlemeye devam et" }).click();
    await expect(
      dialog.getByLabel("Koltuk kullanımı", { exact: true }),
    ).toHaveValue("emre");
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText("Koltuk kullanımı: Emre Kaya");
    await expect(
      row.getByRole("button", { name: "Düzenle", exact: true }),
    ).toBeFocused();
    await row.getByRole("button", { name: "Düzenle", exact: true }).click();
    await dialog
      .getByLabel("Koltuk kullanımı", { exact: true })
      .selectOption("can");
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("çakışıyor");
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
      path: `test-results/chair-dialog-${width}.png`,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Değişiklikleri bırak" }).click();
    await row.getByRole("button", { name: "İlişkili randevular" }).click();
    const related = page.getByRole("dialog");
    await expect(related.locator(".appointment-row")).not.toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: `test-results/chair-list-${width}.png`,
      fullPage: true,
    });
    if (width === 1440) {
      await mkdir(".local/panel-snapshots", { recursive: true });
      const html = (await page.content())
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace("<head>", '<head><base href="http://127.0.0.1:4173/">');
      await writeFile(".local/panel-snapshots/chairs.html", html);
    }
  });
}

test("management pagination, searching and page-size changes", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "/yonetim/koltuklar");
  for (let i = 1; i <= 10; i++) {
    await page.getByRole("button", { name: "Yeni kayıt ekle" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Ad", { exact: true }).fill(`Ek koltuk ${i}`);
    await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await expect(page.locator(".resource-row")).toHaveCount(10);
  await expect(page.getByText("12 kayıttan 1–10 arası")).toBeVisible();
  await page.getByRole("button", { name: "Sonraki", exact: true }).click();
  await expect(page.locator(".resource-row")).toHaveCount(2);
  await page.getByLabel("Listede ara", { exact: true }).fill("Pencere");
  await expect(page.locator(".resource-row")).toHaveCount(1);
  await expect(page.getByText("Sayfa 1 / 1")).toBeVisible();
  await page.getByRole("button", { name: "Filtreleri temizle" }).click();
  await page.getByLabel("Sayfa başına").selectOption("20");
  await expect(page.locator(".resource-row")).toHaveCount(12);
});

test("customer details and filter pagination use server period", async ({
  page,
}) => {
  await login(page, "musteri@example.test");
  await expect(page.locator(".appointment-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Randevu detayı", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Pencere yanı");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Geçmiş randevular", exact: true })
    .click();
  await expect(page).toHaveURL(/period=past/);
  await expect(page.locator(".appointment-row")).toHaveCount(1);
  await expect(page.locator(".appointment-row")).toContainText("Tamamlandı");
});

test("employee schedule list is searchable and role-scoped", async ({
  page,
}) => {
  await login(page, "berber@example.test");
  await navigate(page, "/calisan/mesai");
  await expect(page.locator(".resource-row")).toHaveCount(2);
  await page.getByLabel("Listede ara", { exact: true }).fill("Öğle");
  await expect(page.locator(".resource-row")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Yeni kayıt ekle" }),
  ).toHaveCount(0);
});
