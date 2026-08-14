import { test, expect } from "@playwright/test";

import { EQUIPMENT_WORK_URL, login } from "./equipment-helpers";

// F-MK T5b · M3 (`/makine/calisma`) FONKSİYONEL e2e'si.
//
// Kapsam: rota AÇILIYOR (ComingSoon DEĞİL) · 🔴 §0 SUNUCUNUN `totals`ı basılır
// (satırlarla KASITLI OLARAK tutarsız fikstür bunu kanıtlar) · K3 `null`
// türevler "—" + gerekçe · K10 "+ Kayıt Ekle" devre-dışı + GÖRÜNÜR gerekçe ·
// şantiye süzgeci SUNUCUYA gider.
//
// 🔒 SALT-OKUR: bu dosya hiçbir POST/PATCH tetiklemez.

test("'/makine/calisma' gerçek ekranı açar ve SUNUCUNUN toplamını basar (§0)", async ({
  page,
}) => {
  await login(page);
  await page.goto(EQUIPMENT_WORK_URL);

  await expect(page.getByRole("heading", { level: 1, name: "Çalışma Kaydı" })).toBeVisible();
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);

  // 🔴 §0 — fikstürün `totals`ı satırlarıyla TUTARSIZDIR (satırlar 424,5 saat ·
  // ₺144.200 eder). Ekran SUNUCUNUNKİNİ basar, satırları TOPLAMAZ.
  const totals = page.getByTestId("makine-cal-summary-totals");
  await expect(totals).toContainText("428");
  await expect(totals).toContainText("%69 ort.");
  await expect(totals).toContainText("₺ 124.800");
  await expect(page.getByTestId("makine-cal-kpi")).toContainText("428 Saat");

  await expect(page.getByTestId("makine-cal-summary-row")).toHaveCount(4);
  // Haftalık grafik de AYNI özet gövdesinden gelir (5 hafta kovası).
  await expect(page.getByTestId("makine-cal-week")).toHaveCount(5);
  // 5. KPI kartı AYRI uçtan (`/equipment/fuel-summary`) beslenir.
  await expect(page.getByTestId("makine-cal-kpi-fuel")).toContainText("2.840 Lt");
});

test("K3 — hesaplanamayan kullanım oranı ve maliyet '—' basar, 0 BASMAZ", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_WORK_URL);

  // `monthly_capacity_hours: 0` ⇒ `usage_pct: null` + `no_capacity_hours`.
  const usageEmpty = page.getByTestId("makine-cal-usage-empty");
  await expect(usageEmpty).toHaveCount(1);
  await expect(usageEmpty).toContainText("—");
  await expect(usageEmpty).toHaveAttribute("title", /kapasite saati tanımlı değil/i);

  // Kira/saat bedeli tanımsız ARIZALI makine: maliyet `null`, uydurma 0 YOK.
  const costEmpty = page.getByTestId("makine-cal-cost-empty");
  await expect(costEmpty).toHaveCount(1);
  await expect(costEmpty).toContainText("—");
  await expect(costEmpty).toHaveAttribute("title", /maliyet hesaplanamıyor/i);
});

test("K10 — '+ Kayıt Ekle' devre-dışıdır ve gerekçesi ekranda GÖRÜNÜR", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_WORK_URL);

  await expect(page.getByTestId("makine-cal-add-record")).toBeDisabled();
  await expect(page.getByTestId("makine-cal-export")).toBeDisabled();
  // Gerekçe `title` ipucunda SAKLI DEĞİL — kullanıcı fareyi bekletmeden görür.
  await expect(page.locator("#makine-cal-add-reason")).toContainText(
    "Çalışma kaydı giriş formunun mockup'ı henüz yok.",
  );

  // Rotası/ucu olmayan öbür öğeler de SİLİNMEDİ, devre-dışı + gerekçeli.
  await expect(page.getByTestId("makine-cal-equipment-filter")).toBeDisabled();
  await expect(page.getByTestId("makine-cal-recent-all")).toBeDisabled();
  await expect(page.getByTestId("makine-cal-filter-reasons")).toContainText(
    "Özet ucu ekipman süzgeci almıyor",
  );
});

test("şantiye süzgeci SUNUCUYA gider (istemci süzmesi YOK)", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_WORK_URL);
  await expect(page.getByTestId("makine-cal-summary-row")).toHaveCount(4);

  const filtered = page.waitForRequest(
    (request) =>
      request.url().includes("/equipment/work-summary") && request.url().includes("site_id=s-2"),
  );
  await page.getByTestId("makine-cal-site-filter").selectOption("s-2");
  await filtered;

  await expect(page).toHaveURL(/site=s-2/);
  // Sunucu süzdüğü için tablo TEK satıra iner.
  await expect(page.getByTestId("makine-cal-summary-row")).toHaveCount(1);
  await expect(page.getByTestId("makine-cal-summary-table")).toContainText("Damperli Kamyon FMX");
});
