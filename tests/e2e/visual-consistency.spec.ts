import { mkdirSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const out = ".taste-skill/consistency-audit";
mkdirSync(out, { recursive: true });

for (const width of [390, 1440]) {
  test(`booking stages validation payment feedback and confirmation ${width}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/randevu");
    if (width === 1440)
      await page.getByRole("button", { name: "Koyu temaya geç" }).click();
    await page.getByRole("radio", { name: /Saç kesimi/ }).check();
    await audit(page, `booking-service-${width}`);
    await page.getByRole("button", { name: "Berber seçimine geç" }).click();
    await page.getByRole("radio", { name: /Emre Kaya/ }).check();
    await audit(page, `booking-staff-${width}`);
    await page.getByRole("button", { name: "Saat seçimine geç" }).click();
    await page.getByLabel("Randevu tarihi").fill("2026-10-27");
    await page.getByRole("radio").first().check();
    await audit(page, `booking-time-${width}`);
    await page.getByRole("button", { name: "Bilgilerimi gir" }).click();
    await page.getByRole("button", { name: "Özeti kontrol et" }).click();
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
    await audit(page, `booking-validation-${width}`);
    await page.getByLabel("Ad soyad", { exact: true }).fill("Örnek Ziyaretçi");
    await page
      .getByLabel("E-posta", { exact: true })
      .fill("visit@example.test");
    await page.getByLabel("Telefon", { exact: true }).fill("+90 555 000 00 00");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Özeti kontrol et" }).click();
    await audit(page, `booking-summary-${width}`);
    await page
      .getByRole("button", { name: "Randevuyu oluştur", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Demo kaporayı onayla" }),
    ).toBeVisible();
    await audit(page, `booking-hold-${width}`);
    await page.locator(".demo-bar summary").click();
    await page.getByLabel("Test senaryosu").selectOption("payment-failed");
    await page.getByRole("button", { name: "Demo kaporayı onayla" }).click();
    await expect(page.getByRole("alert")).toContainText("başarısız");
    await audit(page, `booking-payment-error-${width}`);
    await page.getByLabel("Test senaryosu").selectOption("success");
    await page.getByRole("button", { name: "Demo kaporayı onayla" }).click();
    await expect(
      page.getByRole("heading", { name: "Zamanınız ayrıldı." }),
    ).toBeVisible();
    await audit(page, `booking-confirmed-${width}`);
  });
}

async function audit(page: Page, name: string) {
  await expect(page).toHaveTitle(/\S/);
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main .loading")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    name,
  ).toBe(true);
  const violations = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
  ).violations;
  expect(violations, name).toEqual([]);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}

async function signIn(page: Page, email: string, width: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("/giris");
  if (width === 768)
    await page.getByRole("button", { name: "Koyu temaya geç" }).click();
  await page.getByLabel("E-posta", { exact: true }).fill(email);
  await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page).not.toHaveURL(/\/giris$/);
}

async function operationLink(page: Page, href: string) {
  const toggle = page.locator(".mobile-nav-toggle button");
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute("aria-expanded")) === "false")
      await toggle.click();
  }
  await page.locator(`.operations-nav a[href="${href}"]`).click();
  await expect(page).toHaveURL(new RegExp(href + "$"));
}

for (const width of [390, 768, 1440]) {
  test(`all management screens and editors ${width}`, async ({ page }) => {
    test.setTimeout(120000);
    await signIn(page, "yonetici@example.test", width);
    await audit(page, `manager-overview-${width}`);
    for (const route of [
      "takvim",
      "hizmetler",
      "calisanlar",
      "koltuklar",
      "mesai",
      "musteriler",
      "odemeler",
      "raporlar",
      "ayarlar",
    ]) {
      await operationLink(page, `/yonetim/${route}`);
      await audit(page, `manager-${route}-${width}`);
      const edit = page
        .getByRole("button", { name: "Düzenle", exact: true })
        .first();
      if (await edit.isVisible()) {
        await edit.click();
        await expect(page.locator(".editor")).toBeVisible();
        await audit(page, `editor-${route}-${width}`);
      }
    }
  });

  test(`staff navigation and plans ${width}`, async ({ page }) => {
    test.setTimeout(60000);
    await signIn(page, "berber@example.test", width);
    await audit(page, `staff-overview-${width}`);
    for (const route of ["takvim", "mesai"]) {
      await operationLink(page, `/calisan/${route}`);
      await audit(page, `staff-${route}-${width}`);
    }
  });

  test(`sign-in registration and fallback screens ${width}`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/giris");
    if (width === 768)
      await page.getByRole("button", { name: "Koyu temaya geç" }).click();
    await audit(page, `login-${width}`);
    await page.getByRole("button", { name: "Yeni hesap oluştur" }).click();
    await audit(page, `register-${width}`);
    await page
      .getByRole("button", { name: "Hesap oluştur", exact: true })
      .click();
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
    await audit(page, `register-validation-${width}`);
    for (const [name, path] of [
      ["missing", "/bulunamayan-sayfa"],
      ["access", "/randevularim"],
    ]) {
      await page.goto(path!);
      await audit(page, `${name}-${width}`);
    }
  });

  test(`appointments changes cancellation and role denial ${width}`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await signIn(page, "musteri@example.test", width);
    await audit(page, `appointments-${width}`);
    await page.getByRole("button", { name: "Saati değiştir" }).first().click();
    await expect(page.getByLabel("Yeni randevu tarihi")).toBeVisible();
    await audit(page, `reschedule-${width}`);
    await page.getByRole("button", { name: "Saati değiştir" }).first().click();
    await page
      .getByRole("button", { name: "Randevuyu iptal et" })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await audit(page, `cancel-dialog-${width}`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await page
      .getByRole("button", { name: "Geçmiş randevular", exact: true })
      .click();
    await audit(page, `past-appointments-${width}`);
    await page.evaluate(() => {
      history.pushState({}, "", "/yonetim");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(
      page.getByRole("heading", { name: "Erişim yetkiniz yok" }),
    ).toBeVisible();
    await audit(page, `role-denied-${width}`);
  });
}

test("public navigation keeps brand identity and returns to the intended section", async ({
  page,
}) => {
  await page.goto("/");
  const brand = () =>
    page.locator(".site-header .brand").evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        font: s.fontFamily,
        size: s.fontSize,
        weight: s.fontWeight,
        color: s.color,
      };
    });
  const homeBrand = await brand();
  const accent = await page
    .locator(".landing-hero .landing-button")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.locator('.site-header a[href="/randevu"]').click();
  await page.getByRole("radio", { name: /Saç kesimi/ }).check();
  expect(await brand()).toEqual(homeBrand);
  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      page
        .getByRole("button", { name: "Berber seçimine geç" })
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe(accent);
  await page.locator('.site-header a[href="/giris"]').click();
  expect(await brand()).toEqual(homeBrand);
  await page.locator('.site-header a[href="/#hizmetler"]').click();
  await expect(page).toHaveURL(/\/#hizmetler$/);
  await expect
    .poll(() =>
      page
        .locator("#hizmetler")
        .evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeLessThan(100);
});
