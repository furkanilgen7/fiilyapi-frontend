import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type {
  EquipmentRatePeriod,
  RentalInvoiceStatus,
  RentalLineKind,
  VarianceStatus,
} from "@/lib/api/hooks/useEquipmentRentalInvoices";

/**
 * F-KIRA T-A · M5 (`Makine - Kira Hakedişi.dc.html`) etiket/renk sözlüğü.
 *
 * Her harita `Record<Enum, …>`tur: sunucu enum'una yeni bir üye girerse
 * DERLEME KIRILIR. Bu bir kusur değil ÖZELLİKTİR — sessizce boş basan bir
 * ekran yerine kapı kırmızıya döner.
 *
 * UYARI: burada eşik/yüzde/aritmetik yoktur; sunucudan gelen dizenin GÖRÜNÜME
 * çevrilmesidir (F-P10/F-ST/F-MK kanonu).
 */

/**
 * Durum rozeti. Metin `pending_verification` için mockup M5:65'ten BİREBİR
 * ("Doğrulama Bekliyor"); öbür üçü emsal hakediş sözlüğüyle aynı dili konuşur.
 *
 * Renkler emsal desenden (`progress-payments/shared/status.ts:33-41`) alınır
 * ama O DOSYA İTHAL EDİLMEZ: durum kümesi FARKLIDIR (`pending_verification`
 * vs `pending_approval`) ve orayı bu dilim için genişletmek iki ekranın
 * durum makinesini birbirine kilitlerdi.
 */
export const RENTAL_STATUS_BADGE: Record<
  RentalInvoiceStatus,
  { readonly label: string; readonly variant: BadgeVariant }
> = {
  draft: { label: "Taslak", variant: "neutral" },
  pending_verification: { label: "Doğrulama Bekliyor", variant: "warning" },
  approved: { label: "Onaylandı", variant: "success" },
  paid: { label: "Ödendi", variant: "primary" },
};

/**
 * Satır türü rozeti METNİ — mockup'tan BİREBİR.
 *
 * 🔴 `breakdown` da "Kiralık" yazar (M5:134): arıza satırı ayrı bir tür rozeti
 * TAŞIMAZ, kiralık makinenin arıza saatidir. Rozet "Arıza" deseydi tablo aynı
 * makineyi iki farklı türde gösterirdi; arızanın kendisi zaten satır adında
 * ("… — Arıza") ve üstü çizili tutarda görünür.
 */
export const RENTAL_LINE_KIND_LABEL: Record<RentalLineKind, string> = {
  rented: "Kiralık", // M5:106
  owned: "Kendi", // M5:146
  breakdown: "Kiralık", // M5:134
};

/** Rozet renkleri mockup zemin/metin çiftlerinden: `#fee2e2/#dc2626` = danger, `#dcfce7/#16a34a` = success. */
export const RENTAL_LINE_KIND_BADGE_VARIANT: Record<RentalLineKind, BadgeVariant> = {
  rented: "danger",
  owned: "success",
  breakdown: "danger",
};

/** Kira tipi seçeneği — M5:74 `<option>` metinleri birebir. */
export const RATE_PERIOD_LABEL: Record<EquipmentRatePeriod, string> = {
  hourly: "Saatlik Kira",
  daily: "Günlük Kira",
  monthly: "Aylık Sabit",
};

/**
 * Varyans rozeti rengi. `match` yeşil (M5:112 `#dcfce7/#16a34a`), `over` amber
 * (M5:126 `#fef3c7/#d97706`).
 *
 * `under` mockup'ta ÇİZİLMEMİŞTİR (VARSAYIM, rapora not edildi): eksik
 * faturalama da fazla faturalama kadar bir SAPMADIR ve aynı dikkat rengini
 * hak eder — nötr bırakılsaydı firma bizden az faturaladığında ekran hiçbir
 * şey demezdi. `unknown` nötrdür: sapma değil, henüz ölçülmemişliktir.
 */
export const VARIANCE_BADGE_VARIANT: Record<VarianceStatus, BadgeVariant> = {
  match: "success",
  over: "warning",
  under: "warning",
  unknown: "neutral",
};

/**
 * K6 — `site_id`/`site_name` `null` ise kova "Atanmamış"tır (şema gerekçesi:
 * `RentalSiteDistributionEntry` docstring'i). Uydurma bir proje adı BASILMAZ.
 */
export const RENTAL_UNASSIGNED_SITE_LABEL = "Atanmamış";

/** Veri olmayan hücrenin işareti — mockup M5:135'in KENDİ işareti. */
export const RENTAL_EMPTY_CELL = "—";

/** Kendi malı satırında "Kira B.F." hücresinin metni (M5:149). */
export const RENTAL_OWNED_RATE_LABEL = "Amortisman";

/* ---------------------------------------------------------------------------
 * Varyans rozeti METİNLERİ — 🔴 ÇIPLAK GLİF YASAĞI.
 *
 * Mockup M5:112 onay tikiyle "Esleşiyor", M5:126 uyari ucgeniyle "6 saat
 * fark" yazar. Semboller BURAYA
 * YAZILMAZ: U+26A0 ve U+2713 `src/styles/fonts.css` alt kümelerinin
 * HİÇBİRİNDE yoktur (265 `unicode-range` aralığı ayrıştırılarak ölçüldü) ve
 * `ubuntu-latest`te fontconfig ikamesine düşerek görsel kareyi oynatırlar
 * (F-MU2/F-SEM dersi, `src/test-guards/symbol-subset-guard.test.ts`).
 * Sembol gerekiyorsa `ui/icons` inline SVG'sinden gelir.
 * ------------------------------------------------------------------------ */
export const RENTAL_VARIANCE_MATCH_LABEL = "Eşleşiyor";
export const RENTAL_VARIANCE_DIFF_SUFFIX = "saat fark";
/** Backend gerekçesi (`rental.py:224-231`): fatura saati girilmemiş olması EKRANDA görünmelidir. */
export const RENTAL_VARIANCE_UNKNOWN_LABEL = "Fatura saati girilmedi";

/* ---------------------------------------------------------------------------
 * K3 — TABLO KOLONLARI. Mockup `thead` DOKUZ kolondur (M5:88-96) ama `tbody`
 * satır 3-4 yalnız 7, `tfoot`un dört satırı da 8 hücre taşır. Kanon: `thead`
 * KAZANIR — kolon kümesinin tek kaynağı burasıdır ve her satır tam dokuza
 * tamamlanır (bkz. `rentalRowCells`).
 * ------------------------------------------------------------------------ */
export const RENTAL_COLUMNS = [
  "equipment",
  "site",
  "lineKind",
  "workedHours",
  "breakdownHours",
  "rateAmount",
  "ourAmount",
  "invoicedHours",
  "variance",
] as const;

export type RentalColumnKey = (typeof RENTAL_COLUMNS)[number];

/** `thead` başlıkları — M5:88-96 metinleri BİREBİR (₺ dahil). */
export const RENTAL_COLUMN_LABEL: Record<RentalColumnKey, string> = {
  equipment: "Ekipman",
  site: "Şantiye",
  lineKind: "Tür",
  workedHours: "Çalışma (Saat)",
  breakdownHours: "Arıza (Saat)",
  rateAmount: "Kira B.F. ₺",
  ourAmount: "Bizim Hesap",
  invoicedHours: "Fatura Saati",
  variance: "Fark / Onay",
};

/* ---------------------------------------------------------------------------
 * PENDING GEREKÇELERİ — rotası/formu olmayan öğeler SİLİNMEZ, devre-dışı +
 * GÖRÜNÜR gerekçeyle basılır (F-TH kalıcı kuralı). Metinler tek kaynaktan
 * gelir; ekranlar cümle KOPYALAMAZ.
 * ------------------------------------------------------------------------ */

/**
 * `POST /equipment/rental-invoices` uç olarak AÇIKTIR ama oluşturma formunun
 * mockup'ı çizilmemiştir: `Makine - Kira Hakedişi.dc.html` dolu bir
 * `pending_verification` faturasını gösterir, boş/oluşturma hâlini değil
 * (TASARIM-BRIEFI-2 madde 17'de borç olarak kayıtlı). Uç açık diye form
 * İCAT EDİLMEZ — F-MK'nın `+ Kayıt Ekle` düğmesiyle aynı karar
 * (`equipment-work/work-labels.ts:5-7`).
 */
export const RENTAL_CREATE_FORM_PENDING_REASON =
  "Kira hakedişi oluşturma formunun mockup'ı henüz yok.";

/**
 * `POST …/reload` (çalışma kaydından tazeleme) mockup'ta ÇİZİLMEMİŞTİR (K2) →
 * bu dilimde basılmaz. Dönem/şantiye değişikliği satırları KENDİLİĞİNDEN
 * tazelemez (`RentalInvoiceUpdate` açıklaması), bu yüzden kullanıcı sessiz
 * bırakılmaz: başlık düzenleme alanlarının yanında bu not görünür.
 */
export const RENTAL_RELOAD_PENDING_REASON =
  "Dönem veya şantiye değiştirmek satırları yeniden yüklemez; çalışma kaydından tazeleme yüzeyi henüz çizilmedi.";

/**
 * tfoot varyans rozetinin bilinmezlik hâli. Satır düzeyindeki
 * `RENTAL_VARIANCE_UNKNOWN_LABEL`ten AYRI bir cümledir: orada TEK bir satırın
 * fatura saati girilmemiştir, burada TOPLAM doğrulanamamıştır (kiralık satır
 * yok ya da en az birinin saati eksik). Aynı metin kullanılsaydı tfoot,
 * olmayan tek bir satır hakkında konuşurdu.
 */
export const RENTAL_VARIANCE_TOTAL_UNKNOWN_LABEL = "Doğrulanamadı";
