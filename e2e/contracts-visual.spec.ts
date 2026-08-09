import { test, expect } from "@playwright/test";

import { login, settleScrollTop } from "./contracts-visual-helpers";

// F-P5 T8 · SZL (`/sozlesmeler`) görsel testleri. Kanon: projedesign
// `Sözleşmeler.dc.html`. `progress-payments-visual.spec.ts` deseninin aynısı.
//
// İKİ sekme AYRI kare olarak basılır ve sekme durumu URL'den kurulur
// (`?type=`) — sekmeye TIKLANMAZ, yani kadraj gezinme zamanlamasından
// bağımsızdır ve "tıklama + `fullPage`" birleşimi hiç oluşmaz.
//
// ⚠️ `.szl` kökünde `animation: var(--anim-fade-up)` vardır → kadrajdan ÖNCE
// ekranın YÜKLENDİĞİ durum-tabanlı bir iddiayla doğrulanır (WORKFLOW §4
// "GÖRSEL SPEC KURALI" 1. parça); aksi hâlde kare fade'in ortasında düşer.
//
// 🔒 FİKSTÜR İZOLASYONU: bu dosya HİÇBİR kayda dokunmaz. Kadrajın okuduğu
// `GET /contracts` satırları (işveren: `EMPLOYER_CONTRACT_P1` sabiti; taşeron:
// `state.subcontractorContracts`) koşu boyunca HİÇBİR spec tarafından
// mutasyona uğratılmaz — `subcontractor-contract-form.spec.ts` sözleşme POST'u
// ATMAZ, `subcontractors.spec.ts` taşeron POST'u ATMAZ.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

test("sozlesmeler isveren sekmesi gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/sozlesmeler");

  await expect(page.getByRole("heading", { level: 1, name: "Sözleşmeler" })).toBeVisible();
  // Yerleşim oturdu: KPI şeridi basıldı VE ilerleme çubuğu çizildi (işveren
  // satırında `progress_pct` doludur) — yükleme/iskelet hâli baseline'a girmez.
  await expect(page.getByTestId("szl-kpi-strip")).toBeVisible();
  await expect(page.getByTestId("szl-progress").first()).toBeVisible();
  // S2 kararının iki yüzü de kadrajda: devre-dışı buton + görünür gerekçe.
  await expect(page.getByTestId("szl-new-contract-disabled")).toBeDisabled();
  await expect(page.getByText("İşveren sözleşmesi proje formunda kurulur.")).toBeVisible();

  await settleScrollTop(page);
  await expect(page).toHaveScreenshot("sozlesmeler-isveren.png", { fullPage: true });
});

test("sozlesmeler taseron sekmesi gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/sozlesmeler?type=subcontractor");

  await expect(page.getByRole("heading", { level: 1, name: "Sözleşmeler" })).toBeVisible();
  await expect(page.getByTestId("szl-kpi-strip")).toBeVisible();
  // Taşeron sekmesinin AYIRT EDİCİ üç öğesi kadrajda: "—" düşen ilerleme
  // hücresi, "—" düşen hakediş KPI'ı ve yalnız bu sekmede çizilen giriş.
  await expect(page.getByTestId("szl-progress-pending").first()).toBeVisible();
  await expect(page.getByTestId("szl-kpi-payment-total")).toHaveText(/—/);
  await expect(page.getByRole("link", { name: "Taşeron Firmaları →" })).toBeVisible();

  await settleScrollTop(page);
  await expect(page).toHaveScreenshot("sozlesmeler-taseron.png", { fullPage: true });
});
