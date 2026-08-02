import { test, expect } from "@playwright/test";

// F-P6 T4 · Bölüm Detay ekranı görsel testi (mockup Bölüm Detay.dc.html).
// sec-1 (A-Blok Şantiyesi altında, TÜM P6 alanları dolu) kullanılıyor — READ-ONLY
// (yalnız GET), hiçbir spec bu kaydı mutasyona uğratmıyor (section-form.spec.ts
// TÜM oluşturma/düzenleme akışlarını s-2 "B-Blok Şantiyesi" altında ayrı
// kayıtlarla yürütür, bkz. o dosyanın başlık yorumu) — P7'deki `pp-6` yarışı
// burada tekrarlanmıyor.
//
// ⚠️ Bilinen zamana-bağlı risk: "Kalan Gün" hücresi `remainingDays.ts` ile
// `new Date()`e göre İSTEMCİ TARAFINDA hesaplanır (sec-1 `end_date`:
// "2026-09-30"), test-enjekte edilebilir bir "bugün" parametresi YOK (T2'de
// böyle kuruldu). Bu yüzden bu baseline, üretildiği GÜNE göre donar ve
// zaman ilerledikçe (gün sayısı azaldıkça) metin küçük bir pikselde kayabilir
// — mockup'ın kendisinde sabit örnek veri var, gerçek ekranda yok. T4 kapsamı
// dışı bir düzeltme (SiteHeroBar.remaining_days gibi sunucu-taraflı sabit bir
// alana çevrilmedikçe kalıcı çözülmez); rapora not düşüldü.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("bolum detay ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-1");
  await expect(page.getByRole("heading", { level: 1, name: "Kat 6–10 Kaba İnşaat" })).toBeVisible();
  // Bölüm Bedeli (gerçek veri) yüklendi — yükleme/iskelet durumunu dondurmamak için.
  await expect(page.getByTestId("section-hero-kpi-budget")).toContainText("₺");
  // Varsayılan sekme paneli (İş Kalemleri) render oldu.
  await expect(page.getByText("İş Kalemleri — bu bölümde henüz görüntülenemiyor")).toBeVisible();
  // Alt satır kartları (Bu Bölümdeki İşçiler / Bölüm Malzeme Durumu) kadrajda.
  await expect(page.getByText("Bölüm Malzeme Durumu")).toBeVisible();

  await expect(page).toHaveScreenshot("bolum-detay.png", { fullPage: true });
});
