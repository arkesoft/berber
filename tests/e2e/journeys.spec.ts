import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("booking recovers after commit response loss even after availability refresh", async ({
  page,
}) => {
  await selectBooking(page);
  await page.locator(".demo-bar summary").click();
  await page.getByLabel("Test senaryosu").selectOption("response-lost");
  await page
    .getByRole("button", { name: "Randevuyu oluştur", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Test senaryosu").selectOption("success");
  await page
    .getByRole("button", { name: "Randevuyu oluştur", exact: true })
    .click();
  await page.getByRole("button", { name: "Demo kaporayı onayla" }).click();
  await expect(
    page.getByRole("heading", { name: "Zamanınız ayrıldı." }),
  ).toBeVisible();
  await expect(page.locator(".receipt")).toContainText("r-21");
});
test("failed demo payment can be retried without a second reservation", async ({
  page,
}) => {
  await selectBooking(page);
  await page
    .getByRole("button", { name: "Randevuyu oluştur", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Demo kaporayı onayla" }),
  ).toBeVisible();
  await page.locator(".demo-bar summary").click();
  await page.getByLabel("Test senaryosu").selectOption("payment-failed");
  await page.getByRole("button", { name: "Demo kaporayı onayla" }).click();
  await expect(page.getByRole("alert")).toContainText("başarısız");
  await page.getByLabel("Test senaryosu").selectOption("success");
  await page.getByRole("button", { name: "Demo kaporayı onayla" }).click();
  await expect(
    page.getByRole("heading", { name: "Zamanınız ayrıldı." }),
  ).toBeVisible();
});
test("customer registration creates only a customer session", async ({
  page,
}) => {
  await page.goto("/giris");
  await page.getByRole("button", { name: "Yeni hesap oluştur" }).click();
  await page.getByLabel("Ad soyad", { exact: true }).fill("Yeni Ziyaretçi");
  await page.getByLabel("E-posta", { exact: true }).fill("yeni@example.test");
  await page.getByLabel("Telefon", { exact: true }).fill("+90 555 000 00 00");
  await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
  await page
    .getByRole("button", { name: "Hesap oluştur", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Randevularım", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Bu görünümde randevu bulunmuyor."),
  ).toBeVisible();
});
test("manager creates a customer record and validates contact fields", async ({
  page,
}) => {
  await login(page, "yonetici@example.test");
  await page.getByRole("link", { name: "Müşteriler", exact: true }).click();
  await page.getByRole("button", { name: "Yeni kayıt ekle" }).click();
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("Bu alan gerekli.").first()).toBeVisible();
  await page.getByLabel("Ad", { exact: true }).fill("Yeni Salon Müşterisi");
  await page.getByLabel("E-posta", { exact: true }).fill("salon@example.test");
  await page.getByLabel("Telefon", { exact: true }).fill("+90 555 000 00 00");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    page.getByText("Yeni Salon Müşterisi", { exact: true }),
  ).toBeVisible();
});
async function login(page: Page, email: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta", { exact: true }).fill(email);
  await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
}
async function selectBooking(page: Page) {
  await page.goto("/randevu");
  await page.getByRole("radio", { name: /Saç kesimi/ }).check();
  await page.getByRole("button", { name: "Berber seçimine geç" }).click();
  await page.getByRole("radio", { name: /Emre Kaya/ }).check();
  await page.getByRole("button", { name: "Saat seçimine geç" }).click();
  await page.getByLabel("Randevu tarihi").fill("2026-10-27");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Bilgilerimi gir" }).click();
  await page.getByLabel("Ad soyad", { exact: true }).fill("Örnek Ziyaretçi");
  await page.getByLabel("E-posta", { exact: true }).fill("visit@example.test");
  await page.getByLabel("Telefon", { exact: true }).fill("+90 555 000 00 00");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Özeti kontrol et" }).click();
}
test("guest booking and demo payment complete without a card form", async ({
  page,
}) => {
  await selectBooking(page);
  await page
    .getByRole("button", { name: "Randevuyu oluştur", exact: true })
    .click();
  await page.getByRole("button", { name: "Demo kaporayı onayla" }).click();
  await expect(
    page.getByRole("heading", { name: "Zamanınız ayrıldı." }),
  ).toBeVisible();
  await expect(page.locator("input")).toHaveCount(0);
});
test("conflict returns to time selection without losing contact details", async ({
  page,
}) => {
  await selectBooking(page);
  await page.locator(".demo-bar summary").click();
  await page.getByLabel("Test senaryosu").selectOption("conflict");
  await page
    .getByRole("button", { name: "Randevuyu oluştur", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("az önce doldu");
  await expect(page.getByLabel("Randevu tarihi")).toBeVisible();
});
test("customer can reschedule and cancel their own appointment", async ({
  page,
}) => {
  await login(page, "musteri@example.test");
  await expect(
    page.getByRole("heading", { name: "Randevularım", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Saati değiştir" }).first().click();
  await page.getByLabel("Yeni randevu tarihi").fill("2026-10-27");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Yeni saati onayla" }).click();
  await expect(page.getByLabel("Yeni randevu tarihi")).toHaveCount(0);
  await page.getByRole("button", { name: "Randevuyu iptal et" }).click();
  await page.getByRole("button", { name: "İptali onayla" }).click();
  await expect(
    page.getByText("Bu görünümde randevu bulunmuyor."),
  ).toBeVisible();
});
test("manager edits a service and visits all management screens", async ({
  page,
}) => {
  await login(page, "yonetici@example.test");
  await expect(
    page.getByRole("heading", { name: "Günlük bakış" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Hizmetler ve fiyatlar" }).click();
  await page
    .getByRole("button", { name: "Düzenle", exact: true })
    .first()
    .click();
  await page.getByLabel("Ücret (TL)", { exact: true }).fill("700.00");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Değişiklikler kaydedildi." }),
  ).toBeVisible();
  for (const label of [
    "Çalışanlar",
    "Koltuklar",
    "Mesai ve izin",
    "Müşteriler",
    "Tahsilat kayıtları",
    "Temel raporlar",
    "Salon ayarları",
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
  }
});
test("staff sees own schedule and cannot enter management", async ({
  page,
}) => {
  await login(page, "berber@example.test");
  await expect(
    page.getByRole("heading", { name: "Günlük planım" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hizmeti başlat" }).first().click();
  await expect(
    page
      .locator(".appointment-row .status")
      .filter({ hasText: "Hizmet sürüyor" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hizmeti tamamla" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Onayla", exact: true })
    .click();
  await page.getByRole("link", { name: "Mola ve izinlerim" }).click();
  await expect(
    page.getByRole("heading", { name: "Mola", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Salon", exact: true }).click();
  await page.evaluate(() => {
    history.pushState({}, "", "/yonetim");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(
    page.getByRole("heading", { name: "Erişim yetkiniz yok" }),
  ).toBeVisible();
});
for (const width of [390, 768, 1440])
  test(`responsive accessibility ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/randevu");
    await expect(page.getByRole("radio", { name: /Saç kesimi/ })).toBeVisible();
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations;
    expect(violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/booking-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
