import { test, expect } from "@playwright/test";

import { login, pinPurchasingFixtures } from "./purchasing-visual-helpers";
import { prepareFrame } from "./visual-scroll";

// F-SA T5a · FST (`/satinalma/talep/yeni`) Satın Alma Talebi formu — mockup
// `Form - Satinalma Talebi.dc.html`. `stock-entry-visual.spec.ts` /
// `sales-form-visual.spec.ts` deseninin aynısı.
//
// SALT-OKUR: form AÇILIR ama GÖNDERİLMEZ — hiçbir POST tetiklenmez. (Yazma
// zinciri `purchasing-flows.spec.ts`tedir.)
//
// ⏱️ SAAT SABİTLEME (ZORUNLU): "Talep Tarihi" alanı BUGÜNle doldurulur
// (`PurchaseRequestForm` → `isoDate(new Date())`) ve uygulama kodunda
// test-enjekte edilebilir bir "bugün" parametresi YOKTUR (T5 kapsamı uygulama
// kodunu DEĞİŞTİRMEZ). Sabitlenmezse baseline üretildiği güne donar ve ertesi
// gün kırılır. `mask:` YERİNE saat dondurma seçilir: alan mockup'ta GERÇEK bir
// tarih basar, maskelenmiş gri kutu mockup sadakatini bozardı. Saat 09:00 UTC:
// hem UTC hem TR (+03) yerel takviminde AYNI güne düşer.
//
// 🔒 Tedarikçi kutucukları GERÇEK listeden basılır (FST 122-131) → koşu
// sırasında doğan tedarikçiler kadraja sızmasın diye `pinPurchasingFixtures`
// uygulanır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const FORM_URL = "/satinalma/talep/yeni";

/** Kadrajın sabit "bugünü" — fikstür dünyasıyla tutarlı, TZ'den bağımsız. */
const FIXED_TODAY = "2026-08-12T09:00:00Z";
const FIXED_TODAY_ISO = "2026-08-12";
/**
 * Aynı günün TR gösterimi. Tarih alanı artık `ui/date-input` primitive'idir ve
 * ekrana `gg.aa.yyyy` basar (F-DATE) — ama iddia hâlâ AYNI ŞEYİ kanıtlar:
 * alan dondurulmuş GÜNDEN dolar. İkinci bir tarih sabiti YAZILMAZ; ISO
 * sabitinden TÜRETİLİR ki saat dondurma değiştiğinde ikisi ayrışmasın.
 */
const FIXED_TODAY_DISPLAY = FIXED_TODAY_ISO.split("-").reverse().join(".");


test("satinalma talep formu gorsel", async ({ page }) => {
  await pinPurchasingFixtures(page);
  await page.clock.setFixedTime(new Date(FIXED_TODAY));
  await login(page);

  await page.goto(FORM_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Satın Alma Talebi" })).toBeVisible();

  // YERLEŞİM OTURDU (WORKFLOW §4, 1. parça):
  // (a) saat sabitlemesi İŞLEDİ: tarih alanı deterministik,
  await expect(page.getByTestId("talep-tarihi")).toHaveValue(FIXED_TODAY_DISPLAY);
  // (b) proje listesi GELDİ (yükleme/hata hâlinde select devre dışıdır),
  await expect(page.getByTestId("talep-proje")).toBeEnabled();
  // (c) stok kartları geldi — ilk satırın malzeme seçicisi devre dışı DEĞİL,
  await expect(page.getByTestId("talep-malzeme-0")).toBeEnabled();
  // (d) tedarikçi listesi geldi ("Yükleniyor…" notu kadraja giremez),
  await expect(page.getByTestId("talep-tedarikci-listesi")).toContainText(
    "Yıldız Hazır Beton A.Ş.",
  );
  // (e) talep numarası kayıttan ÖNCE BOŞTUR (sunucu üretir) — mockup'ın örnek
  //     numarası uydurulmaz,
  await expect(page.getByTestId("talep-no")).toHaveValue("");
  // (f) onay akışı kutusu boş formun hükmünü basıyor.
  await expect(page.getByTestId("talep-onay-sonuc")).toContainText("Patron onayı");

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("satinalma-talep-formu.png", { fullPage: true });
});
