import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

async function login(page: Page) {
  await page.goto("/giris");
  await page
    .getByLabel("E-posta", { exact: true })
    .fill("yonetici@example.test");
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
for (const width of [390, 768, 1440])
  test(`manager collects partial/full amounts and preserves correction history ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await login(page);
    if (width === 768)
      await page.getByRole("button", { name: "Koyu temaya geç" }).click();
    await navigate(page, "/yonetim/odemeler");
    const row = page.locator(".resource-row").filter({ hasText: "Mert Aydın" });
    await row.getByRole("button", { name: "Tahsilat", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Tahsilat", exact: true });
    await expect(dialog).toContainText("Kısmi ödeme alındı");
    await dialog.getByLabel("Alınan tutar (TL)").fill("501");
    await dialog.getByRole("button", { name: "Tahsilatı kaydet" }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Kalan bakiyeyi aşmayan",
    );
    await expect(dialog.getByLabel("Alınan tutar (TL)")).toBeFocused();
    await dialog.getByLabel("Alınan tutar (TL)").fill("100,25");
    await dialog.getByLabel("Tahsilat yöntemi").selectOption("card");
    await dialog.getByLabel("Açıklama (isteğe bağlı)").fill("İlk tahsilat");
    await dialog.getByRole("button", { name: "Tahsilatı kaydet" }).click();
    await expect(dialog).toContainText("Tahsilat kaydedildi.");
    await expect(dialog.locator(".collection-summary")).toContainText("250,25");
    await expect(dialog.locator(".collection-summary")).toContainText("399,75");
    await dialog.getByLabel("Alınan tutar (TL)").fill("399,75");
    await dialog.getByLabel("Açıklama (isteğe bağlı)").fill("Kalan ücret");
    await dialog.getByRole("button", { name: "Tahsilatı kaydet" }).click();
    await expect(dialog).toContainText("Tamamı alındı");
    await expect(dialog.getByLabel("Alınan tutar (TL)")).toHaveCount(0);
    await dialog
      .locator(".resource-row")
      .filter({ hasText: "Kalan ücret" })
      .getByRole("button", { name: "Hatalı kaydı düzelt" })
      .click();
    await dialog.getByLabel("Düzeltme nedeni").fill("Yanlış tutar girildi");
    await dialog
      .getByRole("button", { name: "Kaydı düzelt", exact: true })
      .click();
    await expect(dialog).toContainText("Hatalı tahsilat düzeltildi.");
    await expect(dialog.locator(".resource-row")).toHaveCount(4);
    await expect(dialog.locator(".collection-summary")).toContainText("250,25");
    expect(
      (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mkdir(".local/collection-snapshots", { recursive: true });
    await dialog.evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({
      path: `.local/collection-snapshots/modal-${width}.png`,
    });
    if (width === 1440)
      await writeFile(
        ".local/collection-snapshots/modal.html",
        await page.content(),
      );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      row.getByRole("button", { name: "Tahsilat", exact: true }),
    ).toBeFocused();
    await page.getByLabel("Durum", { exact: true }).selectOption("partial");
    await expect(row).toBeVisible();
  });

test("independent payment preferences change public visibility and zero-deposit commit", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "/yonetim/odeme-ayarlari");
  await page.getByLabel("Kapora iste", { exact: true }).uncheck();
  await page
    .getByLabel("Çevrim içi ödeme alanını müşteriye göster", { exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("Tahsilat tercihleri kaydedildi.")).toBeVisible();
  await navigate(page, "/yonetim");
  await navigate(page, "/yonetim/odeme-ayarlari");
  await expect(
    page.getByLabel("Kapora iste", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Çevrim içi ödeme alanını müşteriye göster", {
      exact: true,
    }),
  ).not.toBeChecked();
  await navigate(page, "/randevu");
  await page.getByRole("radio", { name: /Saç kesimi/ }).check();
  await page.getByRole("button", { name: "Berber seçimine geç" }).click();
  await page.getByRole("radio", { name: /Emre Kaya/ }).check();
  await page.getByRole("button", { name: "Saat seçimine geç" }).click();
  await page.getByLabel("Randevu tarihi").fill("2026-10-27");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Bilgilerimi gir" }).click();
  await page.getByLabel("Ad soyad", { exact: true }).fill("Kapora Test");
  await page.getByLabel("E-posta", { exact: true }).fill("kapora@example.test");
  await page.getByLabel("Telefon", { exact: true }).fill("+905550000000");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Özeti kontrol et" }).click();
  await expect(
    page.getByRole("region", { name: "Çevrim içi ödeme", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Bu randevuda kapora istenmiyor.")).toBeVisible();
  await page
    .getByRole("button", { name: "Randevuyu oluştur", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Zamanınız ayrıldı." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Demo kaporayı onayla" }),
  ).toHaveCount(0);
  await navigate(page, "/yonetim/odeme-ayarlari");
  await page
    .getByLabel("Çevrim içi ödeme alanını müşteriye göster", { exact: true })
    .check();
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("Tahsilat tercihleri kaydedildi.")).toBeVisible();
  const catalog = await page.evaluate(async () =>
    (await fetch("/api/v1/catalog")).json(),
  );
  expect(catalog.paymentSettings).toMatchObject({
    depositEnabled: false,
    onlinePaymentVisible: true,
  });
  expect(catalog.services[0].deposit.amount).toBe(0);
});

test("a lost collection response retries the same receipt", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "/yonetim/odemeler");
  await page.locator(".demo-bar summary").click();
  await page.getByLabel("Test senaryosu").selectOption("response-lost");
  await page
    .locator(".resource-row")
    .filter({ hasText: "Mert Aydın" })
    .getByRole("button", { name: "Tahsilat", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Tahsilat", exact: true });
  await dialog.getByLabel("Alınan tutar (TL)").fill("100");
  await dialog.getByRole("button", { name: "Tahsilatı kaydet" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Tahsilatı kaydet" }).click();
  await expect(dialog).toContainText("Tahsilat kaydedildi.");
  await expect(dialog.locator(".resource-row")).toHaveCount(2);
  await expect(dialog.locator(".collection-summary")).toContainText("250,00");
});
