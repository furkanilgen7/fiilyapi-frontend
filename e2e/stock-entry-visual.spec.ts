import { test, expect, type Page } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-ST T5 · SG (`.../santiyeler/{siteId}/stok/giris`) görsel testi — mockup
// `Form - Stok Girisi.dc.html`. `section-detail-visual.spec.ts` /
// `site-diary-visual.spec.ts` deseninin aynısı.
//
// SALT-OKUR: form AÇILIR ama GÖNDERİLMEZ — hiçbir POST tetiklenmez. Stok
// kayıtlarının PROJE KAPSAMI YOKTUR (T1 kuralı): başarılı bir yazma
// bakiyeleri değiştirip stok baseline'larını sessizce kırardı.
//
// ⏱️ SAAT SABİTLEME (ZORUNLU — T4 uyarısı): "Giriş Tarihi" alanı BUGÜNle
// doldurulur (`StockEntryForm` → `isoDate(new Date())`) ve uygulama kodunda
// test-enjekte edilebilir bir "bugün" parametresi YOKTUR (T5 kapsamı uygulama
// kodunu DEĞİŞTİRMEZ). Sabitlenmezse baseline üretildiği güne donar ve ertesi
// gün kırılır. Çözüm test tarafındadır: `page.clock.setFixedTime`
// NAVİGASYONDAN ÖNCE kurulur; `mask:` YERİNE bu seçildi çünkü alan mockup'ta
// gerçek bir tarih basar (maskelenmiş gri kutu mockup sadakatini bozardı).
// Saat 09:00 UTC seçilir: hem UTC hem TR (+03) yerel takviminde AYNI güne
// düşer, `isoDate` yerel takvimden türettiği için TZ kayması olmaz.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

/** Kadrajın sabit "bugün"ü — fikstür dünyasıyla tutarlı, TZ'den bağımsız. */
const FIXED_TODAY = "2026-08-10T09:00:00Z";
const FIXED_TODAY_ISO = "2026-08-10";
/**
 * Aynı günün TR gösterimi. Tarih alanı artık `ui/date-input` primitive'idir ve
 * ekrana `gg.aa.yyyy` basar (F-DATE) — ama iddia hâlâ AYNI ŞEYİ kanıtlar:
 * alan dondurulmuş GÜNDEN dolar. İkinci bir tarih sabiti YAZILMAZ; ISO
 * sabitinden TÜRETİLİR ki saat dondurma değiştiğinde ikisi ayrışmasın.
 */
const FIXED_TODAY_DISPLAY = FIXED_TODAY_ISO.split("-").reverse().join(".");


const ENTRY_URL = "/projeler/p-1/santiyeler/s-1/stok/giris";

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("stok giris formu gorsel", async ({ page }) => {
  await page.clock.setFixedTime(new Date(FIXED_TODAY));
  await login(page);

  await page.goto(ENTRY_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Stok Girişi" })).toBeVisible();

  // YERLEŞİM OTURDU (WORKFLOW §4, 1. parça):
  // (a) depo listesi GELDİ ve rotadan ön dolduruldu (yükleme durumunda select
  //     devre dışıdır ve boş değer taşır),
  await expect(page.getByTestId("stok-giris-depo")).toHaveValue("wh-1");
  await expect(page.getByTestId("stok-giris-depo")).toBeEnabled();
  // (b) malzeme kartları geldi — satır select'i devre dışı DEĞİL,
  await expect(page.getByTestId("stok-giris-malzeme-0")).toBeEnabled();
  // (c) kullanıcı listesi geldi — "Teslim Alan" devre dışı DEĞİL,
  await expect(page.getByTestId("stok-giris-teslim-alan")).toBeEnabled();
  // (d) saat sabitlemesi İŞLEDİ: tarih alanı deterministik.
  await expect(page.getByTestId("stok-giris-tarih")).toHaveValue(FIXED_TODAY_DISPLAY);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("stok-giris-formu.png", { fullPage: true });
});
