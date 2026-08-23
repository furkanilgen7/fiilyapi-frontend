import type { BadgeVariant } from "@/components/ui";
import type {
  PayrollLineStatus,
  PayrollPeriodStatus,
  WorkerSource,
} from "@/lib/api/hooks/usePayroll";

/**
 * F-BOR T2 · `/bordro` ekranının METİN TEK KAYNAĞI. Yorumlardaki sayılar
 * `Bordro Yönetimi.dc.html` ("BY") dosyasının SATIR numaralarıdır.
 */

/* ------------------------------------------------------------------ rotalar */

/**
 * F-BOR T5 (K1/K8) · Üç bordro ekranının rotaları — TEK TANIM.
 *
 * 🔴 Bu dosya `"use client"` DEĞİLDİR ve bilinçli olarak öyle kalır: rotaları
 * `PayrollTabsStrip`te (client) tutup oradan `PersonnelTabsStrip`e (server
 * component) import etmek, yalnız iki string uğruna o sunucu bileşenini
 * istemci sınırına çekerdi. Sabitler bu yüzden düz bir modülde yaşar
 * (`HR_DOCUMENTS_ROUTE` / `LEAVES_ROUTE` emsali), iki şerit de buradan okur.
 */
export const PAYROLL_ROUTE = "/bordro";
export const PAYROLL_HISTORY_ROUTE = "/bordro/gecmis";
export const PAYROLL_SGK_ROUTE = "/bordro/sgk";

/* ------------------------------------------------------------------ başlık */

export const BREADCRUMB = "Mali · Bordro"; // BY:46
export const PAGE_TITLE = "Bordro Yönetimi"; // BY:48
export const EXPORT_LABEL = "Excel"; // BY:55
export const PAY_LABEL = "Ödemeyi Onayla"; // BY:56
export const APPROVE_ALL_LABEL = "Tümünü Onayla"; // BY:303
export const PREV_PERIOD_LABEL = "Önceki dönem"; // BY:51 `‹`
export const NEXT_PERIOD_LABEL = "Sonraki dönem"; // BY:53 `›`

/* ------------------------------------------------------------- dönem durumu */

/**
 * 🔴 K3 — `PayrollPeriodStatus`un DÖRT değerinin HEPSİ etiketlenir. Mockup
 * yalnız `pending_approval` hâlini çiziyor (BY:63 "onay bekliyor"); geri
 * kalan üçü de gerçek sonuçtur ve ham enum değeri ekrana SIZAMAZ.
 *
 * `Record<PayrollPeriodStatus, …>` TAM tiplidir: enum büyürse derleyici
 * bağırır (`diary-labels.ts` kanonu).
 */
export const PERIOD_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  draft: "Taslak",
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  paid: "Ödendi",
};

export const PERIOD_STATUS_VARIANTS: Record<PayrollPeriodStatus, BadgeVariant> = {
  draft: "neutral",
  pending_approval: "warning",
  approved: "primary",
  paid: "success",
};

/* ------------------------------------------------------------ satır durumu */

/**
 * 🔴 K3 — `PayrollLineStatus`un BEŞ değerinin HEPSİ ayrı etiket + ayrı rozet
 * varyantı alır. Mockup her satırı "Beklemede" çiziyor (BY:148) ama gerçek
 * veri beş hâli de üretir.
 *
 * 🔴 `excluded` KRİTİKTİR: taşeron satırı GÖRÜNÜR ve maliyete girer ama
 * ÖDENMEZ (ödemesi hakediş üzerinden taşerona yapılır). Mockup bu satırları
 * normal ödeme satırı gibi çiziyor (BY:178-237) — ONAYLI SAPMA: etiket
 * "Ödemeye Girmez" der ve rozet nötr/uyarı tonundadır, "Beklemede" DEĞİL.
 */
export const LINE_STATUS_LABELS: Record<PayrollLineStatus, string> = {
  uncomputed: "Hesaplanamadı",
  pending: "Beklemede", // BY:148
  approved: "Onaylandı",
  paid: "Ödendi",
  excluded: "Ödemeye Girmez",
};

export const LINE_STATUS_VARIANTS: Record<PayrollLineStatus, BadgeVariant> = {
  uncomputed: "danger",
  pending: "warning",
  approved: "primary",
  paid: "success",
  excluded: "neutral",
};

/* ---------------------------------------------------------- personel tipi */

/**
 * 🔴 ENUM TAMLIĞI — `WorkerSource` BEŞ üyelidir, mockup DÖRT bölüm çiziyor
 * (BY:99-102 sekmeleri · BY:124/172/240/268 bölüm başlıkları). Eksik olan
 * `general` ("genel işçi") sessizce DÜŞÜRÜLMEZ: şema açıklaması onun bordro
 * tipi olmadığını söyler ("bu değerin oran satırı yoktur") ama sunucu böyle
 * bir satır dönerse ekran onu ADIYLA basmalıdır — yoksa personel görünmez
 * olur ve toplamlar açıklanamaz.
 *
 * Sunum kararı: `general` beşinci bir sekme/bölüm olarak MOCKUP'IN DIŞINDA
 * basılır ve YALNIZ sunucu gerçekten böyle bir bölüm döndürdüğünde görünür
 * (bkz. `payroll-derive.ts/orderedSections`). REDDEDİLEN alternatif: onu
 * "Taşeron" ya da "Şirket" altına katmak — o, ham veriyi ekranda YENİDEN
 * SINIFLANDIRMAK olurdu.
 */
export const SOURCE_TAB_LABELS: Record<WorkerSource, string> = {
  company: "Şirket Kadrosu", // BY:99
  subcontractor: "Taşeron İşçisi", // BY:100
  freelance: "Serbest Meslek", // BY:101
  intern: "Stajyer", // BY:102
  general: "Genel İşçi", // mockup'ta YOK — enum tamlığı
};

/** Satır "Tür" hücresinin kısa rozeti (BY:137/185/253/281). */
export const SOURCE_BADGE_LABELS: Record<WorkerSource, string> = {
  company: "Şirket", // BY:137
  subcontractor: "Taşeron", // BY:185
  freelance: "Serbest", // BY:253
  intern: "Stajyer", // BY:281
  general: "Genel",
};

/** Bölüm başlığının rejim açıklaması (BY:127/175/243/271). */
export const SOURCE_SECTION_REGIME: Record<WorkerSource, string> = {
  company: "SGK 4a", // BY:127
  subcontractor: "SGK Taşeron", // BY:175
  freelance: "Serbest Makbuz · %20 Stopaj", // BY:243
  intern: "Staj ücreti", // BY:271
  // Mockup'ta karşılığı YOK; rejim UYDURULMAZ, eksikliği söylenir.
  //
  // 🔴 F-BOR T7 · METİN DÜZELTİLDİ (ölçüldü). Eskiden "Bordro oran seti
  // tanımsız" yazıyordu ve bu bir OLGU İDDİASIDIR — oysa bu bant, oranların
  // durumunu HİÇ okumaz: sabit bir kaynak etiketidir ve `general` tipin oran
  // seti PEKÂLÂ tanımlı olabilir (sahte backend'de tanımlıdır). Oran
  // eksikliğinin GERÇEK yüzeyi ayrıdır ve veriden türer:
  // `unknown_cost_count` bandı (bu ekran) ile `unknown_rate_count` bandı (SGK
  // ekranı). Sabit etiket o iki bandı YALANLIYORDU: kullanıcı, oranı tanımlı
  // bir tipte "oran seti tanımsız" okuyup bandların susmasını çelişki sanardı.
  // Yeni metin yalnız BİLİNMEYENİ söyler, olmayan bir olgu bildirmez.
  general: "Bordro rejimi belirtilmedi",
};

/** Bölüm başlığındaki sayaç birimi (BY:127 "12 çalışan" · BY:175 "29 işçi"). */
export const SOURCE_SECTION_UNIT: Record<WorkerSource, string> = {
  company: "çalışan", // BY:127
  subcontractor: "işçi", // BY:175
  freelance: "kişi", // BY:243
  intern: "kişi", // BY:271
  general: "kişi",
};

/**
 * Bölümlerin ÇİZİM SIRASI — mockup'ın sırası (BY:124 → 172 → 240 → 268),
 * sonunda enum'un mockup'ta olmayan üyesi. Dizinin `WorkerSource[]` olması
 * `payroll-derive.ts`teki tamlık bekçisiyle birlikte enum büyüdüğünde
 * eksik kalmayı yakalar.
 */
export const SOURCE_ORDER: readonly WorkerSource[] = [
  "company",
  "subcontractor",
  "freelance",
  "intern",
  "general",
];

/* -------------------------------------------------------------- tablo/kart */

export const KPI_NET_LABEL = "Toplam Net Ödenecek"; // BY:69
export const KPI_BANK_LABEL = "Banka Transferi"; // BY:76
export const KPI_CASH_LABEL = "Elden (Nakit)"; // BY:84
export const KPI_COST_LABEL = "İşverene Toplam Maliyet"; // BY:90
export const KPI_COST_HINT = "SGK işveren payı dahil"; // BY:92
export const KPI_PERSON_UNIT = "çalışan"; // BY:71

export const ALL_TAB_LABEL = "Tümü"; // BY:98

export const COL_PERSONNEL = "Personel"; // BY:110
export const COL_SOURCE = "Tür"; // BY:111
export const COL_DAYS = "Gün"; // BY:112
export const COL_GROSS = "Brüt"; // BY:113
export const COL_DEDUCTION = "Kesinti"; // BY:114
export const COL_NET = "Net"; // BY:115
/** 🔴 K5 — BY:116/117'deki `🏦`/`💵` glif kapsamı DIŞINDA; SVG ikon + düz söz. */
export const COL_BANK = "Banka"; // BY:116
export const COL_CASH = "Elden"; // BY:117
export const COL_STATUS = "Durum"; // BY:118

export const TOTAL_ROW_LABEL = "TOPLAM"; // BY:298

/** Sayısı olmayan hücre (BY:254/284 `—`). */
export const EMPTY_VALUE = "—";

/* ------------------------------------------------------- dürüst boş hâller */

export const LOADING_MESSAGE = "Bordro yükleniyor…";
export const PERIODS_ERROR_FALLBACK = "Bordro dönemleri yüklenemedi.";
export const PERIOD_ERROR_FALLBACK = "Bordro dönemi yüklenemedi.";
export const LINE_ERROR_FALLBACK = "Ödeme dağıtımı kaydedilemedi.";
export const APPROVE_ERROR_FALLBACK = "Onay işlemi tamamlanamadı.";
export const PAY_ERROR_FALLBACK = "Ödeme damgası basılamadı.";

/**
 * 🔴 K3 — hiç dönem yoksa AÇIKLAYICI boş durum basılır.
 *
 * 🔴 F-BORDRO T2 · **KARAR DEĞİŞTİ.** Burası eskiden *"Dönem açma ekranı henüz
 * çizilmedi"* diyordu ve `POST /payroll/periods` ucunun HİÇBİR yüzeyi yoktu.
 * Canlıda `payroll_periods` tablosuna satır basan bir migration OLMADIĞI için
 * (bilinçli — dönemi kullanıcı açar) üç bordro ekranı da KALICI olarak boş
 * kalıyordu; kullanıcının bildirdiği *"bordro kısmı çalışmıyor"* kusuru buydu.
 * Yönetim kararı: modülün kullanılamaz kalması, mockup'ı olmayan bir formdan
 * daha kötüdür ⇒ form kanonik kabuktan TÜRETİLDİ (ONAYLI SAPMA).
 */
export const EMPTY_TITLE = "Henüz bordro dönemi yok";
export const EMPTY_BODY =
  "Bu şirkette açılmış bir bordro dönemi bulunmuyor. Başlıktaki “Dönem Aç” düğmesiyle ilk ayı açın; ay açıldıktan sonra satırları “Hesapla” üretir.";

export const NO_LINES_MESSAGE = "Bu dönemde gösterilecek bordro satırı yok.";

/* --------------------------------------------------- fail-closed sayaçlar */

/**
 * 🔴 K3 — dönem detayındaki İKİ fail-closed sayaç. Sıfır olmayan bir sayaç,
 * kartlardaki tutarların EKSİK olduğu anlamına gelir; kullanıcı sıfırları
 * gerçek sanmamalıdır.
 *
 * 🔴 `unknown_rate_count` BU EKRANDA YOKTUR (o `PayrollSgkSummaryResponse`
 * alanıdır, `/bordro/sgk` ekranınındır). Bu ekranın sayacı
 * `unknown_cost_count`tur: satır düzeyinde ÜCRET verisi yoktur.
 */
export const UNCOMPUTED_BAND_TITLE = "Bazı satırlar hesaplanamadı";
export const UNKNOWN_COST_BAND_TITLE = "Bazı satırların işveren maliyeti hesaplanamadı";
export const EXCLUDED_BAND_TITLE = "Ödemeye girmeyen satırlar var";
export const EXCLUDED_BAND_BODY =
  "Taşeron işçisi satırları maliyette görünür ama bordrodan ÖDENMEZ — ödemeleri taşeron hakedişi üzerinden yapılır.";

/* ------------------------------------------------------ ödeme özet kutuları */

export const BANK_BOX_LABEL = "Banka Transferi"; // BY:315
export const CASH_BOX_LABEL = "Elden (Nakit)"; // BY:324
export const EFT_LABEL = "EFT Talimatı Gönder"; // BY:319
export const RECEIPT_LABEL = "Makbuz Oluştur"; // BY:328

/**
 * 🔴 K11 — uçsuz öğe SİLİNMEZ; devre dışı basılır ve gerekçe ÖĞENİN KENDİ
 * `disabledReason` alanından okunur (yanına sabitlenmiş cümle DEĞİL).
 * Şema açıklaması gerekçeyi kendi yazıyor: "Dış entegrasyon YOKTUR (spec §1):
 * EFT talimatı gönderilmez."
 */
export const EFT_DISABLED_REASON =
  "Banka entegrasyonu yok: bordro uçları EFT talimatı göndermiyor (dönem yalnız 'ödendi' damgası alır).";
export const RECEIPT_DISABLED_REASON =
  "Makbuz üretme ucu yok: bordro modülü belge/çıktı üretmiyor (yalnız Excel dışa aktarımı var).";

/* -------------------------------------------------------- işlem sonuç metni */

export const APPROVE_RESULT_PREFIX = "Onaylanan satır";
export const PAY_RESULT_PREFIX = "Ödendi damgası basılan satır";
export const SKIP_UNCOMPUTED_LABEL = "hesaplanamadığı için atlanan";
export const SKIP_EXCLUDED_LABEL = "taşeron olduğu için atlanan";
export const SKIP_ALREADY_APPROVED_LABEL = "zaten onaylı";
export const SKIP_UNAPPROVED_LABEL = "onaylanmadığı için ödenmeyen";

/* ------------------------------------------- F-BORDRO · dönem aç + hesapla */

/**
 * 🔴 ONAYLI SAPMA (F-BORDRO T2/T3): `Bordro Yönetimi.dc.html` başlığı YALNIZ
 * üç denetim çizer — ay gezgini (50-54) · `Excel` (55) · `Ödemeyi Onayla` (56).
 * `Dönem Aç` ve `Hesapla` mockup'ta YOKTUR ve mockup'ları da yoktur
 * (`TASARIM-BRIEFI-2`de bile kayıtlı değil). İkisi de modülün BAŞLANGIÇ
 * yüzeyidir: onlarsız hiçbir dönem açılamaz ve açılan dönem satırsız kalır —
 * yani modül kullanılamaz. Sapma bu gerekçeyle onaylandı ve `ROADMAP-FRONTEND`
 * "Onaylı sapmalar" bölümüne yazıldı. Diğer eksik yüzeyler (satır bazında
 * onay/ret) mockup'ta ÇİZİLMEDİĞİ için EKLENMEDİ.
 */
export const OPEN_PERIOD_LABEL = "Dönem Aç";
export const COMPUTE_LABEL = "Hesapla";

/* dönem açma diyaloğu */
export const OPEN_PERIOD_TITLE = "Bordro Dönemi Aç";
export const OPEN_PERIOD_SUBTITLE =
  "Ay yalnızca AÇILIR; satırlar bu adımda oluşmaz. Dönem açıldıktan sonra “Hesapla” ile puantaj, ücret ve oranlardan bordro satırları üretilir.";
export const OPEN_PERIOD_PERIOD_LABEL = "Dönem";
export const OPEN_PERIOD_YEAR_ARIA = "Bordro yılı";
export const OPEN_PERIOD_MONTH_ARIA = "Bordro ayı";
export const OPEN_PERIOD_DUE_LABEL = "Son ödeme tarihi";
/**
 * 🔴 Alan OPSİYONELDİR ve bu ÖLÇÜLDÜ (`PayrollPeriodCreate.payment_due_date`
 * `date | None = None`): sunucu tarih ÜRETMEZ, varsayılan KOYMAZ ve dönemin
 * yıl/ayıyla tutarlılığını DENETLEMEZ (ödeme sonraki aya sarkabilir).
 */
export const OPEN_PERIOD_DUE_HINT =
  "İsteğe bağlı. Boş bırakılırsa sunucu tarih üretmez; sonradan düzenlenebilir.";
export const OPEN_PERIOD_SUBMIT_LABEL = "Dönemi Aç";
export const OPEN_PERIOD_CANCEL_LABEL = "Vazgeç";
export const OPEN_PERIOD_ERROR_FALLBACK = "Bordro dönemi açılamadı.";

/* hesaplama sonucu */
export const COMPUTE_ERROR_FALLBACK = "Bordro hesaplanamadı.";
export const COMPUTE_RESULT_PREFIX = "Oluşturulan satır";
export const COMPUTE_UPDATED_LABEL = "yeniden hesaplanan";
export const SKIP_OVERRIDDEN_LABEL = "elle düzeltildiği için korunan";
export const SKIP_COMPUTE_APPROVED_LABEL = "onaylı/ödenmiş olduğu için korunan";

/**
 * 🔴 K4 — aynı yılda bu aydan ÖNCE gelen ve henüz açılmamış ya da TASLAK olan
 * dönem varsa kümülatif vergi matrahı EKSİK olabilir. Sunucu bunu sayıyla
 * söyler (`missing_prior_period_count`); sessizce yutulursa kullanıcı yanlış
 * hesaplanmış bir bordroyu doğru sanır.
 */
export const COMPUTE_MISSING_PRIOR_TITLE = "Önceki dönemler eksik";
export function computeMissingPriorBody(count: number): string {
  return `Bu yılda bu aydan önce gelen ${count} dönem henüz açılmamış ya da taslak durumda. Kümülatif gelir vergisi matrahı EKSİK hesaplanmış olabilir; önceki ayları açıp hesapladıktan sonra bu dönemi yeniden hesaplayın.`;
}

/** Ödeme vadesi bandı (BY:61-64). */
export const DUE_DATE_PREFIX = "Son ödeme:";
export const DUE_DATE_MISSING = "Son ödeme tarihi girilmemiş.";
