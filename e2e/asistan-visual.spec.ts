import { test, expect } from "@playwright/test";

import { akisiSabitle, openAsistan, VISUAL_VIEWPORT } from "./asistan-helpers";
import { prepareFrame } from "./visual-scroll";

// AI-CHAT-2 · `/asistan` görsel kadrajları.
// Kanonik mockup: `projedesign/AI Chat.dc.html` (397 satır).
//
// 🔴 ÖLÇÜM: bu ekranın bugüne kadar HİÇ karesi yoktu
// (`command grep -rln "asistan\|AiPanel" e2e/` → EXIT=1), yani mockup
// birebirliği ne dün ne bugün ölçülüyordu. Bu dosya o boşluğu kapatır.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer; içermeyen bir görsel test
// fonksiyonel turda baseline'sız koşar ve KIRMIZI olur.
//
// 🔒 PAYLAŞILAN DURUMA DOKUNMAZ: akış `page.route` ile sayfaya özel olarak
// sabitlenir, sohbet uçları salt okunur. Retry aynı kareyi üretir — kanon
// "RETRY PAYLAŞILAN FİKSTÜRÜ BOZAR" bu dosyada yapısal olarak geçersizdir.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

// ---------------------------------------------------------------------------
// 1) Üç sütunlu kabuk — karşılama durumu (mockup 54-131 · 336-364 · 366-395)
// ---------------------------------------------------------------------------
test("asistan uc sutunlu kabuk gorsel", async ({ page }) => {
  await akisiSabitle(page);
  await openAsistan(page);

  // Karşılama kartı, öneri çipleri ve bağlam paneli birlikte oturmuş olmalı.
  await expect(page.getByText("FİİL AI Asistanı")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nakit akışı nasıl?" })).toBeVisible();
  await expect(page.getByText("Hızlı Analizler")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("asistan-kabuk.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) Zengin cevap — metrik kartları · kâr barı · uyarı · varlık listesi ·
//    özet · kaynak rozetleri · aksiyonlar · geri bildirim şeridi
//    (mockup 144-321)
// ---------------------------------------------------------------------------
test("asistan zengin cevap bloklari gorsel", async ({ page }) => {
  await akisiSabitle(page);
  await openAsistan(page);

  await page.getByLabel("FİİL AI'ya sorun").fill("Bu ayki hakediş ne kadar?");
  await page.getByRole("button", { name: "Gönder" }).click();

  // 🔴 Her blok ayrı ayrı beklenir: biri hâlâ yoldayken çekilen kare kendi
  // içinde tutarsız olur ve baseline'ın hangi ara duruma oturduğu ŞANSA kalır.
  await expect(page.getByTestId("ai-blok-metrik").first()).toBeVisible();
  await expect(page.getByTestId("ai-blok-oran")).toBeVisible();
  await expect(page.getByTestId("ai-blok-uyari")).toBeVisible();
  await expect(page.getByTestId("ai-blok-varlik")).toBeVisible();
  await expect(page.getByTestId("ai-blok-ozet")).toBeVisible();
  await expect(page.getByTestId("ai-blok-kaynak")).toBeVisible();
  await expect(page.getByTestId("ai-blok-aksiyon")).toBeVisible();
  // Geri bildirim şeridi ancak tur BİTTİĞİNDE basılır.
  await expect(page.getByRole("button", { name: /Kopyala/ })).toBeVisible();
  // Yazıyor göstergesi gitmiş olmalı — yoksa kare bir ara durumu dondurur.
  await expect(page.getByTestId("ai-yaziyor")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("asistan-zengin-cevap.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) Geçmiş sohbet — 🔴 A3'ün DÜRÜST bedeli ekranda yazar
// ---------------------------------------------------------------------------
test("asistan gecmis sohbet kartlar saklanmadi gorsel", async ({ page }) => {
  await akisiSabitle(page);
  await openAsistan(page);

  await page.getByRole("button", { name: /Güneşkent A-Blok/ }).click();

  // Araç sonuç gövdeleri saklanmadığı için kartlar YENİDEN ÇİZİLEMEZ; ekran
  // bunu sessizce boş kart basarak değil, YAZARAK söyler.
  await expect(page.getByText(/kartları saklanmadı/)).toBeVisible();
  await expect(page.getByTestId("ai-blok-metrik")).toHaveCount(0);
  // Araç izlerinin ÖZETİ (ad + zarf hâli) yine görünür.
  await expect(page.getByText("gosterge_ozeti")).toBeVisible();
  await expect(page.getByText("Restricted")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("asistan-gecmis-sohbet.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 4) 1024px — dar pencerede üç sütun taşmıyor
// ---------------------------------------------------------------------------
test("asistan dar pencere gorsel", async ({ page }) => {
  await akisiSabitle(page);
  await openAsistan(page);
  await page.setViewportSize({ width: 1024, height: VISUAL_VIEWPORT.height });

  await expect(page.getByLabel("Sohbet bağlamı")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("asistan-1024.png", { fullPage: true });
});
