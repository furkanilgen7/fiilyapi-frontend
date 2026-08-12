import { test, expect, type Page } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-ST T5 · Şantiye › Stok (ŞS) görsel testi — mockup `Şantiye - Stok.dc.html`.
// `site-diary-visual.spec.ts` / `section-detail-visual.spec.ts` deseninin aynısı.
//
// SALT-OKUR: bu dosya hiçbir yazma tetiklemez. Stok kayıtlarının PROJE KAPSAMI
// YOKTUR (T1 kuralı) — bu yüzden fonksiyonel stok spec'leri de yalnız
// REDDEDİLEN gövdeleri dener ve `fullyParallel` altında yarış oluşmaz.
//
// 📅 TARİH BAĞIMSIZ: ekrandaki bakiye/durum/KPI'ların hepsi SUNUCU damgasıdır,
// istemci hiçbir eşik ya da toplam hesaplamaz (spec §3) → `page.clock` gerekmez.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const SITE_STOCK_URL = "/projeler/p-1/santiyeler/s-1/stok";

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("santiye stok sekmesi gorsel", async ({ page }) => {
  await login(page);
  await page.goto(SITE_STOCK_URL);

  // YERLEŞİM OTURDU (WORKFLOW §4, 1. parça):
  // (a) şantiye künyesi geldi — başlık "Stok Durumu" yer tutucusunda DEĞİL,
  await expect(
    page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi — Stok Durumu" }),
  ).toBeVisible();
  // (b) KPI şeridinin dört kartı da GERÇEK sayı basıyor ("—" yalnız yükleme/
  //     hata durumunda çıkar, o hâl kadraja giremez),
  await expect(page.getByTestId("santiye-stok-kpi-strip")).not.toContainText("—");
  // (c) tablo satırları geldi ve rozetler SUNUCUDAN basıldı.
  await expect(page.getByTestId("santiye-stok-row-SNK-0421")).toBeVisible();
  await expect(page.getByTestId("santiye-stok-status-SNK-0421")).toHaveText("Kritik");
  await expect(page.getByTestId("santiye-stok-status-SNK-0055")).toHaveText("Yeterli");
  // Pending iki sütun gerekçeli "—" basar (sayı uydurulmaz) — kadrajın konusu.
  await expect(page.getByTestId("santiye-stok-need-SNK-0421")).toHaveText("—");
  await expect(page.getByTestId("santiye-stok-section-SNK-0421")).toHaveText("—");

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("santiye-stok.png", { fullPage: true });
});
