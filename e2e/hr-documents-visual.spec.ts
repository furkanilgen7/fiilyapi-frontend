import { test, expect, type Page } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-İK T6a · BT (`/personel/belgeler`) görsel testi — mockup
// `İK - Belge Takibi.dc.html`. `personnel-detail-visual.spec.ts` deseninin
// aynısı: tek tam-sayfa kare, salt-okur.
//
// SALT-OKUR: bu dosya hiçbir POST/PATCH tetiklemez, yalnız `GET
// /hr/documents/summary`yi render eder — paylaşılan mock durumunu değiştirmez.
//
// 📅 TARİH BAĞIMSIZ: bant metni, beş KPI, iki liste ve tip dağılımı hepsi
// `HR_DOCUMENTS_SUMMARY_FIXTURE`ten (e2e/mock-backend.ts) AYNEN gelir;
// "Gecikme"/"Kalan" hücreleri sunucunun SABİT `days_overdue`/`days_left`
// tamsayılarını basar (`new Date()` türevi YOK) — `page.clock` gerekmez.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const HR_DOCUMENTS_URL = "/personel/belgeler";

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("personel belge takibi gorsel", async ({ page }) => {
  await login(page);
  await page.goto(HR_DOCUMENTS_URL);

  // YERLEŞİM OTURDU (WORKFLOW §4, 1. parça): KPI şeridi sunucu fikstüründen
  // geldi — "Yükleniyor…" durumu kadraja giremez; sahte "—" GERÇEK "12"ye
  // dönüşmüş olmalı.
  await expect(page.getByRole("heading", { level: 1, name: "Belge & Sertifika" })).toBeVisible();
  const kpiStrip = page.getByTestId("bt-kpi-strip");
  await expect(kpiStrip).toBeVisible();
  await expect(kpiStrip).toContainText("12");
  // Kritik uyarı bandı (expired > 0 ⇒ basılır) + iki liste + dağılım kartı
  // yerleşti — kadraj boş/yükleniyor hâlini yakalamaz.
  await expect(page.getByTestId("bt-critical-alert")).toBeVisible();
  await expect(page.getByTestId("bt-expired-row-pd-1")).toBeVisible();
  await expect(page.getByTestId("bt-expiring-row-pd-2")).toBeVisible();
  await expect(page.getByTestId("bt-breakdown-card")).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("personel-belge-takibi.png", { fullPage: true });
});
