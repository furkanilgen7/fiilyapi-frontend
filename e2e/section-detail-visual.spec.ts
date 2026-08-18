import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-P6 T4 · Bölüm Detay ekranı görsel testi (mockup Bölüm Detay.dc.html).
// sec-1 (A-Blok Şantiyesi altında, TÜM P6 alanları dolu) kullanılıyor — READ-ONLY
// (yalnız GET), hiçbir spec bu kaydı mutasyona uğratmıyor (section-form.spec.ts
// TÜM oluşturma/düzenleme akışlarını s-2 "B-Blok Şantiyesi" altında ayrı
// kayıtlarla yürütür, bkz. o dosyanın başlık yorumu) — P7'deki `pp-6` yarışı
// burada tekrarlanmıyor.
//
// Düzeltme turu 1 (kalite review bulgusu — Important): "Kalan Gün" hücresi
// `remainingDays.ts` ile `new Date()`e göre İSTEMCİ TARAFINDA hesaplanır
// (sec-1 `end_date`: "2026-09-30") — uygulama kodunda test-enjekte edilebilir
// bir "bugün" parametresi YOK (T2'de böyle kuruldu, bu task'ın kapsamı dışı:
// uygulama kodu DEĞİŞTİRİLMEDİ). Sabitlenmemiş bırakılırsa baseline üretildiği
// güne göre donar ve her gün "Kalan Gün" metni bir azalarak baseline'ı kırardı.
// Çözüm TEST TARAFINDA: Playwright'ın saat sabitleme API'si (`page.clock.
// setFixedTime`) NAVİGASYONDAN ÖNCE kurulur — böylece bileşenin `new Date()`
// çağrısı (her render'da yeniden hesaplanıyor, memoize edilmiyor) sabit bir
// zaman görür, sonuç deterministik olur. `mask:` YERİNE bu seçildi çünkü KPI
// hücresi anlamlı bir SAYI basmalı (mockup D91-93 "Kalan Gün" gerçek bir
// değerdir, maskelenmiş gri kutu mockup sadakatini bozardı). Sabit "bugün"
// (2026-09-01, öğlen UTC — TZ kaymasından kaçınmak için) sec-1'in
// `start_date` (2026-01-01) ile `end_date` (2026-09-30) ARASINDA: bölüm hâlâ
// "Aktif" durumuyla tutarlı, Kalan Gün pozitif ve sabit (29) basar.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("bolum detay ekrani gorsel", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-01T12:00:00Z"));
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
  // 🔴 BOQ-SEC-F: varsayılan sekme artık YER TUTUCU DEĞİL, gerçek tablo basıyor.
  // "Yüklendi" iddiası HER BAĞIMSIZ VERİ KAYNAĞINI kapsar (görsel spec 5. parça):
  // bölüm detayı (`useSection`) yukarıdaki başlık/KPI iddialarıyla, süzgeçli BOQ
  // (`useBoq(siteId, sectionId)`) ise aşağıdaki satır iddiasıyla doğrulanır —
  // aksi hâlde kadraj "Yükleniyor…" hâlini dondurabilirdi.
  await expect(page.getByText("İş Kalemleri — Kat 6–10 Kaba İnşaat")).toBeVisible();
  await expect(page.getByTestId("section-boq-row")).toHaveCount(3);
  await expect(page.getByTestId("section-boq-total-amount")).toContainText("3.904.500");
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);
  // Alt satır kartları (Bu Bölümdeki İşçiler / Bölüm Malzeme Durumu) kadrajda.
  await expect(page.getByText("Bölüm Malzeme Durumu")).toBeVisible();
  // Saat sabitlemesi işledi: Kalan Gün deterministik (2026-09-01 → 2026-09-30 = 29 gün).
  await expect(page.getByTestId("section-hero-kpi-days")).toContainText("29");

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay.png", { fullPage: true });
});
