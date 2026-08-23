import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

/**
 * F-PKK · Proje Özeti (KY + KK) ve Paylaşım Tablosu görsel testleri.
 *
 * 🔴 ÜÇ YENİ KARE, SIFIR OYNAYAN KARE. Gerekçe ÖLÇÜLDÜ:
 * bu dilim `ProjectDetailTabs`e iki sekme ekliyor, ama sekmeler YALNIZ
 * `kendi_yatirim` ve `kat_karsiligi` projelerinde basılıyor. e2e'deki proje
 * detay kadrajlarının TAMAMI `p-1` üzerinden geçiyor ve `p-1`
 * **`taahhut`**tur (`mock-backend.ts:664`) — yani `proje-detay.png` dâhil
 * hiçbir mevcut baseline'ın şeridi değişmiyor. Tarama:
 *   `grep -rn 'goto("/projeler/' e2e/` → proje detayına giden TEK kadraj
 *   `project-detail-visual.spec.ts` ve o da `p-1` açıyor.
 *
 * 🔴 Baseline `.png` YALNIZ Linux CI'da (`workflow_dispatch`) üretilir;
 * macOS'ta koşturulup commit EDİLMEZ.
 *
 * `prepareFrame` `./visual-scroll`ten DOĞRUDAN import edilir; sabit
 * `waitForTimeout` YOKTUR ve kadrajdan önce TIKLAMA yapılmaz
 * (tıklama + `fullPage` = bozuk kare).
 */
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * KARE 1 — KENDİ YATIRIM özeti (`Proje - Kendi Yatırım.dc.html`).
 * bbox gerekçesi: kare `fullPage`dir çünkü ekranın DÖRT bloğu da (mor hero ·
 * maliyet kırılımı · kâr projeksiyonu · taşeron tablosu) tek dikey akışta
 * yaşıyor ve aralarındaki HİZA bu dilimin ürünü. Ayrı kırpılmış kareler
 * blokların birbirine göre konumunu bekçilemezdi.
 */
test("proje ozeti kendi yatirim gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto("/projeler/p-2/ozet");

  // ÜÇ BAĞIMSIZ veri kaynağı ayrı ayrı çözülür (F-İK dersi): proje · maliyet ·
  // ünite sayaçları. Biri gelmeden kadraj alınırsa baseline "Yükleniyor…"
  // hâlini dondurur.
  await expect(page.getByRole("heading", { level: 1, name: "Villa B" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Maliyet Kırılımı" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Kâr Projeksiyonu" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Taşeron Hakedişleri" })).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("proje-ozeti-kendi-yatirim.png", { fullPage: true });
});

/**
 * KARE 2 — KAT KARŞILIĞI özeti (`Proje - Kat Karşılığı.dc.html`).
 * bbox gerekçesi: KY'nin kopyası DEĞİLDİR ve ayrı kare hak eder — hero
 * gradyanı TEAL'a döner, hero'ya "Paylaşım Oranı" kutusu girer, "Nakit
 * Durumu" yerine "Arsa Maliyeti" geçer ve taşeron tablosundan `Bekleyen`
 * SÜTUNU DÜŞER. Yani iki düzen arasındaki fark tam olarak bu karenin
 * bekçilediği şeydir; tek kare ikisini birden koruyamaz.
 */
test("proje ozeti kat karsiligi gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto("/projeler/p-3/ozet");

  await expect(page.getByRole("heading", { level: 1, name: "Bahçelievler Konut" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Maliyet Kırılımı" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Taşeron Hakedişleri" })).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("proje-ozeti-kat-karsiligi.png", { fullPage: true });
});

/**
 * KARE 3 — PAYLAŞIM TABLOSU (`Kat Karşılığı - Paylaşım.dc.html`).
 * bbox gerekçesi: yedi sütunlu tablo + İKİ SATIRLI tfoot + teslim takibi
 * kartı bu dilimde doğdu ve hiçbiri öteki iki karede görünmüyor. Özellikle
 * tfoot'un iki tarafı (BİZİM PAY / ARSA SAHİBİ PAYI) `colSpan` ile hizalanır;
 * hizanın kayması yalnız PİKSELDE görünür.
 */
test("paylasim tablosu gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto("/projeler/p-3/paylasim");

  await expect(page.getByRole("heading", { level: 1, name: "Paylaşım Tablosu" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ünite Bazlı Paylaşım" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Arsa Sahibi Teslim Takibi" })).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("paylasim-tablosu.png", { fullPage: true });
});
