import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-TH T6 · Taşeron Hakedişi (Ekran 2) görsel testi. `e2e/progress-payments-
// visual.spec.ts` deseninin BİREBİR aynısı. Fikstür kaynağı `e2e/mock-
// backend.ts` · `buildSubcontractorProgressPaymentFixtures()` — `scpp-1..5`
// (sc-1/sc-2, dört durumun hepsi + "Revize Gerekli" örneği) BİREBİR bu
// dosyanın kadrajındadır.
//
// Test determinizmi (brief §⛔ tuzak 2): `scpp-6`/`scpp-7` —
// `e2e/subcontractor-progress-payments.spec.ts`in mutasyona uğrattığı
// kayıtlar — `hiddenFromLists: true` ile liste/özet uçlarından TAMAMEN
// dışlanır (bkz. `MockSubcontractorProgressPayment.hiddenFromLists`); bu
// ekran o fonksiyonel spec'in ne zaman/hangi sırada koştuğundan
// (`fullyParallel`) yapısal olarak bağımsızdır.
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı
// gereği tüm yazma yüzeyleri ("+ Yeni Hakediş") GÖRÜNÜR hâlde baseline'a
// girer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("taseron hakedisleri listesi ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/hakedisler/taseron");
  await expect(page.getByRole("heading", { name: "Taşeron Hakedişi" })).toBeVisible();
  // Liste yüklendi: KPI şeridi + son satırın (sc-2, taze taslak) başlığı
  // basılı olmadan ekran görüntüsü alınırsa baseline yükleme durumunu
  // dondurur — durum rozeti yerine bu daha kararlı bir çapa.
  await expect(page.getByTestId("thk-kpi-strip")).toBeVisible();
  await expect(page.getByText("Çelik İnşaat Taah.")).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("taseron-hakedisleri-listesi.png", { fullPage: true });
});
