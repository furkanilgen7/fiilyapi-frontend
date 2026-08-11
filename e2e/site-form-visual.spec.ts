import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// Şantiye Ekle formu görsel testi (plan T13, spec §14).
// Rota: /projeler/{projectId}/santiyeler/yeni — mock fikstüründeki p-1 "Kule A"
// (taahhüt) projesi altında; bilgi kutusundaki "Bağlı Proje" satırı bu projeyi
// yazar (`Form - Santiye Ekle.dc.html` satır 53–60, 68).
//
// ── Mock oturumun izin durumu (baseline'da ne görünür) ────────────────────────
// Mock `GET /auth/me` yanıtında (`mock-backend.ts` → `ME`) `permissions` alanı
// YOKTUR → bilinmezlik kuralı (spec §2.5.3) gereği yazma yüzeyleri GÖRÜNÜR
// hâlde baseline'a girer. Bu ekran zaten `useModulePermission` çağırmaz: `sites`
// seviyesi hiçbir yüzeyi kapatmaz, tüm kartlar/butonlar kadrajdadır.
//
// `user_management` ise mock'ta ETKİSİZDİR: mock `GET /users` gerçek backend'in
// `require_permission("user_management", view)` kapısını uygulamaz, 200 döner.
// Yani baseline üç kişi seçicisinin (Şantiye Şefi, İSG Uzmanı, bölüm Sorumlusu)
// DOLU/etkin hâlini gösterir — formun tam hâli, bilinçli seçim. Gerçek canlıda
// sistem yöneticisi dışındaki rollerde bu uç 403 verir (plan TZ-4b, kabul
// edilmiş sınırlama) ve seçiciler `disabled` + açıklamalı düşer; o düşüş yolu
// birim testlerde sabitlidir (`SiteInfoCard.test.tsx`, `user-picker.test.tsx`),
// baseline'a alınmaz — tek ekrana iki görsel yük değer katmaz.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez (plan TZ-2).
test("santiye ekle formu gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/yeni");
  await expect(page.getByRole("heading", { level: 1, name: "Yeni Şantiye Ekle" })).toBeVisible();

  // Proje sorgusu (GET /projects/p-1) çözüldü: kilitli "Bağlı Proje" seçicisi
  // proje adını basar. Çözülmeden çekilirse bilgi kutusu iskelet hâlde donar.
  await expect(page.getByLabel("Bağlı Proje", { exact: true })).toHaveValue("Kule A");

  // Kullanıcı sorgusu (GET /users) çözüldü: yüklenirken üç seçici de `disabled`
  // ve "Yükleniyor…" yazar; etkinleşmeden çekilirse baseline yükleme durumunu
  // dondurur.
  await expect(page.getByLabel("Şantiye Şefi", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("İSG Uzmanı", { exact: true })).toBeEnabled();

  // Son kart (Belgeler) basıldı — sayfanın tamamı kadrajda.
  await expect(page.getByRole("heading", { name: /Belgeler/ })).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("santiye-formu.png", { fullPage: true });
});
