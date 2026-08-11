import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// P7 T7 · İşveren Hakediş Oluştur formu görsel testi. `e2e/boq-visual.spec.ts`
// deseninin BİREBİR aynısı. `create` kipi — `?project=p-1` sorgu parametresi
// ile `ProjectPickerStep` ara adımı atlanır. Poz dağılımı (pivot tablo
// satırları) `e2e/mock-backend.ts` · `CONTRACT_ITEMS_P1`den gelir; kod/ad/
// birim `İşveren Hakediş Oluştur.dc.html` satır 106-172'den BİREBİR
// (03.001-03.003 Betonarme İşleri, 03.010 Kalıp İşleri).
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı
// gereği tüm yazma yüzeyleri (miktar girişleri, "Taslak Kaydet") GÖRÜNÜR
// hâlde baseline'a girer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez. Bu spec `create`
// kipinde hiçbir kaydetme çağrısı YAPMAZ — yalnız formu render eder, mock
// state'i mutasyona uğratmaz.
test("isveren hakedis olustur formu ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/hakedisler/yeni?project=p-1");
  await expect(page.getByRole("heading", { name: "İşveren Hakediş Oluştur" })).toBeVisible();
  // İçerik yüklendi: pivot tablonun son satırı (Kalıp İşleri grubu) ve
  // Fiyat Farkı bandı basılı olmadan ekran görüntüsü alınırsa baseline
  // yükleme durumunu dondurur.
  await expect(page.getByText("Döşeme Kalıbı")).toBeVisible();
  await expect(page.getByTestId("pp-form-ff-band")).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("hakedis-olustur-formu.png", { fullPage: true });
});
