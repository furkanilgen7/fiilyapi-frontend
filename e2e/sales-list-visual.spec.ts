import { test, expect, type Page } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-P8 T4 · SY (`/satis`) Satış Yönetimi listesi — DOLU görsel kadrajı.
// `stock-catalog-visual.spec.ts` / `site-planning-visual.spec.ts` deseninin
// aynısı. Kaynak: `p-1` fikstürü (satışlar sl-1…sl-3) — `sales.spec.ts` bu
// veriyi SALT-OKUR okur, hiçbir yazma tetiklenmez.
//
// SALT-OKUR: bu dosya hiçbir POST/PUT tetiklemez, yalnız fikstürü render eder.
//
// 📅 TARİH BAĞIMSIZ: KPI'lar/durumlar/toplamlar SUNUCU damgasıdır (istemci
// hiçbirini bugüne göre türetmez) — `page.clock` gerekmez. Form tarafındaki
// bugüne bağlı alanlar da yoktur (default hepsi boş); ayrıntı için
// `sales-form-visual.spec.ts`.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const SALES_URL = "/satis";

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("satis yonetimi listesi (dolu) gorsel", async ({ page }) => {
  await login(page);
  await page.goto(SALES_URL);
  await expect(page.getByRole("heading", { name: "Satış Yönetimi", level: 1 })).toBeVisible();

  // YERLEŞİM OTURDU (WORKFLOW §4, 1. parça):
  // (a) KPI şeridi GERÇEK sayı basıyor — yükleme "—" hâlinde hiçbir kartta
  //     `₺` yoktur; summary geldiğinde tutar kartları `formatCompactCurrency`
  //     ile `₺` basar (`SalesKpiStrip`).
  await expect(page.getByTestId("satis-kpi-strip")).toContainText("₺");
  // (b) blok haritası ünite ucundan geldi.
  await expect(page.getByTestId("satis-blok-blk-1")).toContainText("A Blok");
  // (c) tablo satırları geldi ve durum rozetleri basıldı.
  await expect(page.getByTestId("satis-row-sl-1")).toBeVisible();
  await expect(page.getByTestId("satis-durum-sl-2")).toHaveText("Tapu Devredildi");
  await expect(page.getByTestId("satis-durum-sl-3")).toHaveText("Rezerve");
  // (d) tfoot toplamı SÜZÜLMEMİŞ sunucu totals'ından geldi (3 satış).
  await expect(page.getByTestId("satis-toplam")).toContainText("TOPLAM (3 satış)");

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("satis-listesi.png", { fullPage: true });
});
