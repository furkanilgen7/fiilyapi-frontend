import { test, expect } from "@playwright/test";

import { EQUIPMENT_FUEL_URL, login } from "./equipment-helpers";

// F-MK T5b · M4 (`/makine/yakit`) FONKSİYONEL e2e'si.
//
// Kapsam: rota AÇILIYOR (ComingSoon DEĞİL) · K2 rozet SUNUCU damgasından ·
// 🔴 K3'ün EN KRİTİK yolu: `lt_km` normlu ekipmanda sapma "—" (mockup orada
// "%16 yüksek" çiziyor, SUNUCU KAZANIR) · K10 "+ Yakıt Girişi" devre-dışı +
// GÖRÜNÜR gerekçe · ekipman süzgeci SUNUCUYA gider.
//
// 🔒 SALT-OKUR: bu dosya hiçbir POST/PATCH tetiklemez.

test("'/makine/yakit' gerçek ekranı açar; KPI'lar SUNUCU özetinden gelir", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_FUEL_URL);

  await expect(page.getByRole("heading", { level: 1, name: "Yakıt Takibi" })).toBeVisible();
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);

  const kpi = page.getByTestId("makine-yakit-kpi");
  await expect(kpi).toContainText("2.840 Lt");
  await expect(kpi).toContainText("₺ 112.800");
  await expect(kpi).toContainText("6,6 Lt");
  await expect(kpi).toContainText("₺ 39,72");
  // `abnormal_count` SUNUCU sayımıdır — istemci eşikten yeniden saymaz (K2).
  await expect(kpi).toContainText("1 Ekipman");
});

test("K2/K3 — rozet sunucudan gelir; 'no_distance_data' satırında sapma '—'", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_FUEL_URL);

  const rows = page.getByTestId("makine-yakit-consumption-row");
  await expect(rows).toHaveCount(3);

  // `consumption_status: "critical"` ⇒ anormal rozeti + SUNUCUNUN yüzdesi.
  await expect(rows.nth(0).getByTestId("makine-yakit-deviation-abnormal")).toContainText("%26,2");
  // `consumption_status: "normal"` ⇒ "✓ Normal" (yüzde basılmaz).
  await expect(rows.nth(1).getByTestId("makine-yakit-deviation-normal")).toContainText("Normal");

  // 🔴 K3 — `lt_km` normlu ekipman: `deviation_pct: null` +
  // `deviation_reason: "no_distance_data"`. Mockup "%16 yüksek" çiziyor;
  // sunucu kazanır (§0) ve hücre gerekçe ipucuyla "—" basar.
  const deviationEmpty = rows.nth(2).getByTestId("makine-yakit-deviation-empty");
  await expect(deviationEmpty).toContainText("—");
  await expect(deviationEmpty).toHaveAttribute("title", /Kilometre verisi girilmediği/i);
  await expect(rows.nth(2)).toContainText("Damperli Kamyon FMX");
  // Fiili tüketim de hesaplanamıyor ⇒ o hücre de uydurma 0 basmaz.
  await expect(rows.nth(2)).not.toContainText("0,0 Lt/km");
});

test("günlük kayıt tablosu: kayıt başına tüketim '—' + gerekçe, bilinmeyen 'Giren' '—'", async ({
  page,
}) => {
  await login(page);
  await page.goto(EQUIPMENT_FUEL_URL);

  await expect(page.getByTestId("makine-yakit-log-row")).toHaveCount(3);
  // `FuelLogResponse` kayıt başına sapma TAŞIMAZ — sütun silinmez, "—" basar.
  const consumptionCells = page.getByTestId("makine-yakit-log-consumption-empty");
  await expect(consumptionCells).toHaveCount(3);
  await expect(consumptionCells.first()).toHaveAttribute("title", /Kayıt başına tüketim/i);

  // `entered_by_id: null` olan kayıt uydurma bir ad basmaz.
  const table = page.getByTestId("makine-yakit-log-table");
  await expect(table).toContainText("Ahmet Yılmaz (Patron)");
  await expect(table).toContainText("10.08.2026");

  // Trend paneli (altı aylık seri ucu YOK) devre-dışı + GÖRÜNÜR gerekçeli.
  await expect(page.getByTestId("makine-yakit-trend-disabled")).toBeVisible();
  await expect(page.getByTestId("makine-yakit-trend")).toContainText(
    "Aylık yakıt trendi ucu sunucuda yok",
  );
});

test("K10 — '+ Yakıt Girişi' devre-dışıdır ve gerekçesi ekranda GÖRÜNÜR", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_FUEL_URL);

  await expect(page.getByTestId("makine-yakit-add-entry")).toBeDisabled();
  await expect(page.locator("#makine-yakit-add-reason")).toContainText(
    "Yakıt girişi formunun mockup'ı henüz yok.",
  );
});

test("ekipman süzgeci SUNUCUYA gider (istemci süzmesi YOK)", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_FUEL_URL);
  await expect(page.getByTestId("makine-yakit-log-row")).toHaveCount(3);

  const filtered = page.waitForRequest(
    (request) =>
      request.url().includes("/equipment/fuel-logs") && request.url().includes("equipment_id=eq-1"),
  );
  await page.getByTestId("makine-yakit-equipment-filter").selectOption("eq-1");
  await filtered;

  await expect(page).toHaveURL(/equipment=eq-1/);
  await expect(page.getByTestId("makine-yakit-log-row")).toHaveCount(1);
  await expect(page.getByTestId("makine-yakit-log-table")).toContainText("Tower Crane TC-48");
});
