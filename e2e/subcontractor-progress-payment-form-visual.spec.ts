import { test, expect } from "@playwright/test";

// F-TH T6 · Taşeron Hakediş Oluştur formu + sözleşme seçim adımı görsel
// testleri. `e2e/progress-payment-form-visual.spec.ts` deseninin BİREBİR
// aynısı. Sözleşme kalemleri (`SUBCONTRACTOR_CONTRACT_ITEMS_SC1`,
// `e2e/mock-backend.ts`) kod/ad/birim/fiyat BİREBİR bu kadrajdadır.
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı
// gereği tüm yazma yüzeyleri (miktar girişleri, "Taslak Kaydet") GÖRÜNÜR
// hâlde baseline'a girer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez. Bu spec `create`
// kipinde hiçbir kaydetme çağrısı YAPMAZ — yalnız formu render eder, mock
// state'i mutasyona uğratmaz (brief §⛔ tuzak 2 — mutasyona uğrayan kayıt
// kadrajda yok).

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("taseron sozlesme secim adimi ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.goto("/hakedisler/taseron/yeni");
  await expect(page.getByRole("heading", { name: "Taşeron Hakediş Oluştur" })).toBeVisible();
  // İçerik yüklendi: kalıcı bilgi notu + sözleşme seçici basılı olmadan
  // ekran görüntüsü alınırsa baseline yükleme durumunu dondurur.
  await expect(page.getByTestId("th-contract-picker-note")).toBeVisible();
  await expect(page.getByLabel("Taşeron Sözleşmesi")).toBeVisible();
  await expect(page).toHaveScreenshot("taseron-sozlesme-secim-adimi.png", { fullPage: true });
});

test("taseron hakedis olustur formu ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await page.goto("/hakedisler/taseron/yeni?contract=sc-1");
  await expect(page.getByText("Hakediş Oluştur")).toBeVisible();
  // İçerik yüklendi: kalem tablosunun son satırı (Pano Montajı) + tfoot'un
  // NET ÖDENECEK satırı basılı olmadan ekran görüntüsü alınırsa baseline
  // yükleme durumunu dondurur (create kipinde tfoot henüz "—" basar —
  // brief §Kaydetme yolu, ilk kaydetmeye kadar `calculation` yok).
  await expect(page.getByText("Pano Montajı")).toBeVisible();
  await expect(page.getByTestId("thf-coefficient-band")).toBeVisible();
  await expect(page.getByText("NET ÖDENECEK")).toBeVisible();
  await expect(page).toHaveScreenshot("taseron-hakedis-olustur-formu.png", { fullPage: true });
});
