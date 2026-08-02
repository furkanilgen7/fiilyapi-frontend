import { test, expect } from "@playwright/test";

// P7 T7 · Hakedişler listesi (Ekran 14) görsel testi. `e2e/boq-visual.spec.ts`
// deseninin BİREBİR aynısı. Fikstür kaynağı `e2e/mock-backend.ts` ·
// `buildProgressPaymentFixtures()` — değerler `Şantiye - Hakedişler.dc.html`
// satır 90-107'den (İşveren Hakedişleri kartları) alınır; proje/şantiye
// kimlikleri mevcut evrene (p-1 "Kule A") bağlıdır, mockup'ın "Güneşkent
// Konut" ismiyle AYNI DEĞİL (bilinçli, brief §Belirsizlik çözümü 1).
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı
// gereği tüm yazma yüzeyleri ("+ Yeni Hakediş") GÖRÜNÜR hâlde baseline'a
// girer (bkz. mevcut `boq-visual.spec.ts` üst yorumu).
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("hakedişler listesi ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/hakedisler");
  await expect(page.getByRole("heading", { name: "Hakedişler" })).toBeVisible();
  // Liste yüklendi: KPI alt metni (dinamik hakediş sayısı) ve son satırın
  // başlığı basılı olmadan ekran görüntüsü alınırsa baseline yükleme
  // durumunu dondurur — durum rozeti yerine bu daha kararlı bir çapa
  // (rozet veri gelmeden de "Taslak" ile basılabilir).
  await expect(page.getByTestId("pp-kpi-subtitle")).toBeVisible();
  await expect(page.getByText("Kat 6–8 döşeme")).toBeVisible();
  await expect(page).toHaveScreenshot("hakedisler-listesi.png", { fullPage: true });
});
