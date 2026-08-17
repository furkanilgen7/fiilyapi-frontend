/**
 * F-BOR T3 · `/bordro/gecmis` ekranının METİN TEK KAYNAĞI. Yorumlardaki
 * sayılar `Bordro Geçmişi.dc.html` ("BG") dosyasının SATIR numaralarıdır.
 *
 * Dönem durumu etiketleri/rozetleri BURADA YENİDEN YAZILMAZ — T2'nin
 * `payroll-labels.ts` dosyasındaki `PERIOD_STATUS_LABELS` /
 * `PERIOD_STATUS_VARIANTS` tek kaynaktır (K3: dört durumun HEPSİ etiketli).
 */

import { PAYROLL_ROUTE } from "./payroll-labels";

/* ------------------------------------------------------------------ başlık */

export const HISTORY_PAGE_TITLE = "Bordro Geçmişi"; // BG:33
export const YEAR_FILTER_LABEL = "Yıl"; // BG:34 (mockup'ta etiketsiz seçici)

/* ------------------------------------------------------------ Excel indirme */

export const HISTORY_EXPORT_LABEL = "Excel İndir"; // BG:22

/**
 * 🔴 K11 — uçsuz öğe SİLİNMEZ; devre dışı basılır ve gerekçe ÖĞENİN KENDİ
 * `disabledReason` alanından okunur. Ölçüm: bordro modülünde TEK dışa aktarım
 * ucu `GET /payroll/periods/{id}/export`tur (TEK dönem, T2'de `/bordro`
 * ekranına bağlı). Bu ekranın düğmesi DÖNEM-ÜSTÜdür (yıl boyu tüm dönemler) —
 * karşılığı olan uç yoktur, uydurulmaz.
 */
export const HISTORY_EXPORT_DISABLED_REASON =
  "Dönem-üstü Excel ucu yok: bordro modülü yalnız TEK dönemi dışa aktarır. Bir dönemin Excel'i için o dönemi Aylık Bordro ekranında açın.";

/* ------------------------------------------------------------- tablo başlığı */

export const HCOL_PERIOD = "Dönem"; // BG:39
export const HCOL_PERSONNEL = "Çalışan"; // BG:40
export const HCOL_GROSS = "Brüt Maaş"; // BG:41
export const HCOL_SGK_EMPLOYER = "SGK İşveren"; // BG:42
export const HCOL_NET = "Net Ödenen"; // BG:43
export const HCOL_COST = "Toplam Maliyet"; // BG:44
export const HCOL_PAYMENT_DATE = "Ödeme Tarihi"; // BG:45
export const HCOL_STATUS = "Durum"; // BG:46
/** BG:47 başlığı BOŞTUR; erişilebilir ad yine de gerekir (görme engelli okur). */
export const HCOL_DETAIL = "Detay bağlantısı";

export const DETAIL_LINK_LABEL = "Detay"; // BG:59
/** BG:59 — Aylık Bordro ekranı. Rota TEK yerde tanımlıdır (F-BOR T5). */
export const MONTHLY_ROUTE = PAYROLL_ROUTE;

/** BG:51 — dönem adının altındaki ikincil satır. */
export const PAYMENT_PENDING_NOTE = "Ödeme bekliyor";

/* ------------------------------------------------------------------- tfoot */

/** 🔴 K4 — ay sayısı SATIRLARDAN gelir; mockup'ın "(7 Ay)" sabiti KOPYALANMAZ. */
export function historyTotalLabel(year: number, periodCount: number): string {
  return `${year} Toplam (${periodCount} Ay)`; // BG:108
}

/** BG:109 "Ort. 45". */
export function personnelAverageLabel(average: number): string {
  return `Ort. ${average}`;
}

/* ------------------------------------------------------- dürüst boş hâller */

export const HISTORY_LOADING_MESSAGE = "Bordro geçmişi yükleniyor…";
export const HISTORY_ERROR_FALLBACK = "Bordro dönemleri yüklenemedi.";

/**
 * 🔴 K3 — hiç dönem yoksa AÇIKLAYICI boş durum basılır ve dönem açma DÜĞMESİ
 * ÇİZİLMEZ (`POST /payroll/periods` ucu vardır ama formunun mockup'ı yoktur).
 */
export const HISTORY_EMPTY_TITLE = "Henüz bordro dönemi yok";
export const HISTORY_EMPTY_BODY =
  "Bu şirkette açılmış bir bordro dönemi bulunmuyor. Dönem açma ekranı henüz çizilmedi; dönemler açıldığında geçmiş burada yıl yıl listelenir.";

/** Dönem VAR ama seçili yılda YOK — süzgecin kendi boş hâli. */
export const HISTORY_EMPTY_YEAR_TITLE = "Bu yılda bordro dönemi yok";
export function historyEmptyYearBody(year: number): string {
  return `${year} yılında kayıtlı bordro dönemi bulunmuyor. Yıl seçicisinden başka bir yıl seçebilirsiniz.`;
}

/**
 * Toplamların EKSİK olduğu hâl: bir para alanı Decimal olarak
 * ayrıştırılamadıysa o satır toplama girmez ve kullanıcı bunu BİLİR.
 */
export const HISTORY_UNPARSED_TITLE = "Bazı tutarlar toplama girmedi";
export function historyUnparsedBody(count: number): string {
  return `${count} tutar alanı sayı olarak okunamadı; alttaki toplam satırı bu tutarlar OLMADAN hesaplandı.`;
}

/** Sayısı olmayan hücre (T2 `EMPTY_VALUE` ile aynı işaret). */
export { EMPTY_VALUE } from "./payroll-labels";
