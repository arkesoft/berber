import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
async function navigate(page: Page, path: string) {
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
async function chooseStaff(page: Page) {
  await page.getByRole("radio", { name: /Saç kesimi/ }).check();
  await page.getByRole("button", { name: "Berber seçimine geç" }).click();
  await page.getByRole("radio", { name: /Emre Kaya/ }).check();
  await page.getByRole("button", { name: "Saat seçimine geç" }).click();
}
for (const width of [390, 768, 1440])
  test(`occupied times remain disabled with status labels and an accessible legend ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/randevu");
    if (width === 768)
      await page.getByRole("button", { name: "Koyu temaya geç" }).click();
    await chooseStaff(page);
    const busy = page.getByRole("radio", { name: "09:30 Dolu", exact: true });
    await expect(busy).toBeDisabled();
    const next = page.getByRole("button", { name: "Bilgilerimi gir" });
    await expect(next).toBeDisabled();
    await busy.locator("..").click({ force: true });
    await expect(busy).not.toBeChecked();
    await expect(next).toBeDisabled();
    await expect(
      page.getByRole("radio", { name: "09:00 Geçti", exact: true }),
    ).toBeDisabled();
    const first = page.locator(".slot input:not(:disabled)").first();
    await first.focus();
    await page.keyboard.press("Space");
    await expect(first).toBeChecked();
    await expect(next).toBeEnabled();
    await busy.locator("..").click({ force: true });
    await expect(first).toBeChecked();
    await page
      .getByText("Saat renkleri ne anlama geliyor?", { exact: false })
      .click();
    await expect(page.locator(".slot-help")).toContainText(
      "Geçici olarak tutulan saatler",
    );
    await expect(page.locator(".slot-legend")).toContainText("Müsait");
    await expect(page.getByText("Mert Aydın", { exact: true })).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mkdir(".local/slot-snapshots", { recursive: true });
    await page.screenshot({
      path: `.local/slot-snapshots/slots-${width}.png`,
      fullPage: true,
    });
    if (width === 1440)
      await writeFile(".local/slot-snapshots/slots.html", await page.content());
  });

test("manager saves an arbitrary interval and customer times follow it after navigation", async ({
  page,
}) => {
  await page.goto("/giris");
  await page
    .getByLabel("E-posta", { exact: true })
    .fill("yonetici@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Demo12345!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page).not.toHaveURL(/giris$/);
  await navigate(page, "/yonetim/ayarlar");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Kaydı düzenle" });
  const interval = dialog.getByLabel("Randevu saat aralığı (dakika)", {
    exact: true,
  });
  await interval.fill("0");
  await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    dialog.getByText("5 ile 120 arasında tam sayı girin."),
  ).toBeVisible();
  await interval.fill("20");
  await dialog.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("Randevu saat aralığı: 20 dakika", { exact: true }),
  ).toBeVisible();
  await navigate(page, "/yonetim");
  await navigate(page, "/yonetim/ayarlar");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await expect(
    page.getByLabel("Randevu saat aralığı (dakika)", { exact: true }),
  ).toHaveValue("20");
  await page.keyboard.press("Escape");
  await navigate(page, "/randevu");
  await chooseStaff(page);
  await page.getByLabel("Randevu tarihi").fill("2026-10-27");
  await expect(
    page.getByRole("radio", { name: "09:00 Müsait", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("radio", { name: "09:20 Müsait", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("radio", { name: "09:40 Müsait", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("radio", { name: /09:15/ })).toHaveCount(0);
});
