import { test, expect } from "@playwright/test";

import { INSTRUMENTS_URL, login, openInstruments } from "./financial-instruments-helpers";

// F-FIN · `/hazine/cek-senet` (E10) FONKSİYONEL turu — 5. kapı.
// Bu dosya baseline GEREKTİRMEZ ve macOS'ta koşar; adında "gorsel" GEÇMEZ.
//
// 🔒 SALT-OKUR: hiçbir POST/PATCH/DELETE tetiklenmez. Ekran yalnız iki `GET`
// çağırır; `+ Çek Ekle` DEVRE DIŞIDIR ve satır aksiyonu YOKTUR.

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("cek senet ekrani acilir ve E10 basligini basar", async ({ page }) => {
  await openInstruments(page);
  await expect(page.getByText("Hazine · Çek & Senet Yönetimi")).toBeVisible();
});

test("E10:69-90 dort ozet karti tutar ve adetle basar", async ({ page }) => {
  await openInstruments(page);
  await expect(page.getByTestId("fin-card-portfolio")).toContainText("₺ 3,6M");
  await expect(page.getByTestId("fin-card-portfolio")).toContainText("8 adet");
  await expect(page.getByTestId("fin-card-issued")).toContainText("₺ 1,8M");
  await expect(page.getByTestId("fin-card-due")).toContainText("₺ 920B");
  await expect(page.getByTestId("fin-card-returned")).toContainText("₺ 240B");
});

test("E10:113-160 alinan cekler tablosu mockup satirlarini basar", async ({ page }) => {
  await openInstruments(page);
  const rows = page.getByTestId("fin-row");
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("0123456789");
  await expect(rows.first()).toContainText("Güneşkent A.Ş.");
  await expect(rows.first()).toContainText("Proje iş avansı");
  await expect(rows.first()).toContainText("Ziraat Bank");
  await expect(rows.first()).toContainText("01.07.2026");
  await expect(rows.first()).toContainText("25.07.2026");
  await expect(rows.first()).toContainText("₺ 1.200.000");
  await expect(rows.first()).toContainText("Vadede");
});

test("rozet uclusu E10 renkleriyle basar", async ({ page }) => {
  await openInstruments(page);
  const rows = page.getByTestId("fin-row");
  await expect(rows.nth(0).locator(".badge")).toHaveClass(/badge--warning/);
  await expect(rows.nth(1).locator(".badge")).toHaveText("Portföyde");
  await expect(rows.nth(1).locator(".badge")).toHaveClass(/badge--success/);
  // 🔴 AYRIŞMA NOKTASI: vadesi geçmiş AMA tahsil edilmiş satır MAVİ basar.
  await expect(rows.nth(4).locator(".badge")).toHaveText("Tahsil Edildi");
  await expect(rows.nth(4).locator(".badge")).toHaveClass(/badge--primary/);
});

test("E10:94-96 sekmeleri SUZGECTIR — uc ayri kume doner", async ({ page }) => {
  await openInstruments(page);
  await expect(page.getByTestId("fin-row")).toHaveCount(5);

  await page.getByTestId("fin-tab-verilen").click();
  await expect(page).toHaveURL(new RegExp(`\\${INSTRUMENTS_URL}\\?sekme=verilen$`));
  await expect(page.getByTestId("fin-row")).toHaveCount(2);
  await expect(page.getByTestId("fin-row").first()).toContainText("0771234500");

  // 🔴 Senetler sekmesi YÖN SÜZMEZ: alınan da verilen de görünür.
  await page.getByTestId("fin-tab-senet").click();
  await expect(page.getByTestId("fin-row")).toHaveCount(2);
  // 🔴 Seri no sütunu SENET numarası taşır → başlığı da senet olmalı
  // (kareye bakılarak bulunan kusur; sekme değişince başlık DA değişir).
  await expect(page.getByTestId("fin-table").getByRole("columnheader").first()).toHaveText(
    "Senet No",
  );
  await expect(page.getByTestId("fin-row").first()).toContainText("SN-2026-0044");
  await expect(page.getByTestId("fin-row").nth(1)).toContainText("SN-2026-0051");
  // Mockup'ta çizilmeyen dördüncü hâl SESSİZCE atlanmaz.
  await expect(page.getByTestId("fin-row").nth(1).locator(".badge")).toHaveText("İptal");

  await page.getByTestId("fin-tab-alinan").click();
  await expect(page).toHaveURL(new RegExp(`\\${INSTRUMENTS_URL}$`));
  await expect(page.getByTestId("fin-row")).toHaveCount(5);
  await expect(page.getByTestId("fin-table").getByRole("columnheader").first()).toHaveText(
    "Çek No",
  );
});

test("URL sekme parametresi DOGRUDAN acilir (paylasilabilir durum)", async ({ page }) => {
  await openInstruments(page, "senet");
  await expect(page.getByTestId("fin-tab-senet")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("fin-row")).toHaveCount(2);
});

test("🔴 E10:65 + Cek Ekle dugmesi VAR ama TIKLANAMAZ", async ({ page }) => {
  await openInstruments(page);
  const add = page.getByTestId("fin-add");
  await expect(add).toBeVisible();
  await expect(add).toBeDisabled();
  await expect(page.getByTestId("fin-add-reason")).toContainText("tasarımı bekleniyor");
  // Devre dışı düğme tıklanamaz: force ile tetiklense bile rota DEĞİŞMEZ.
  await add.click({ force: true });
  await expect(page).toHaveURL(new RegExp(`\\${INSTRUMENTS_URL}$`));
});

test("bankasi/aciklamasi olmayan kayit SESSIZCE dusmez", async ({ page }) => {
  await openInstruments(page, "verilen");
  const second = page.getByTestId("fin-row").nth(1);
  await expect(second).toContainText("0771234501");
  // Banka hücresi "—" basar; açıklama alt satırı HİÇ basılmaz.
  await expect(second.locator("td").nth(2)).toHaveText("—");
  await expect(second.locator(".fin-table__desc")).toHaveCount(0);
});
