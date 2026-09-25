import { hasAtLeast, type AccessLevel } from "@/lib/auth/permissions";
import { formatFixedDecimal } from "@/lib/earned-value";
import { TR_WEEKDAYS_LONG, formatDateDots } from "@/lib/format";
import type { EvDailyReport } from "@/lib/api/models";

/**
 * PLN-F3.4 · GİR araç çubuğunun SAF karar mantığı (rozet metni, onay
 * düğmesinin görünürlüğü/etkinliği, rapor no biçimi) — `DailyReportScreen`den
 * ayrı: RTL yerine doğrudan test edilir (F3-SÖZLEŞME §3 madde 2/3).
 */

export interface ApproveGate {
  /** Düğme HİÇ basılmaz (izin yok ya da tamamlanmış şantiye ya da zaten onaylı). */
  visible: boolean;
  /** Basılır ama tıklanamaz (S10: taslak günlük var). */
  disabled: boolean;
  /** `disabled` iken gösterilecek neden metni; aksi hâlde `null`. */
  reason: string | null;
}

export interface ApproveGateInput {
  level: AccessLevel | undefined;
  siteCompleted: boolean;
  status: EvDailyReport["status"];
  /** `draft_diary_dates` — taslak (gönderilmemiş) günlükle üretilmiş günler. */
  draftDiaryDates: readonly string[];
}

/**
 * S10 (F3-SÖZLEŞME §3 madde 3 · spec §3.15): taslak günlük varken Onayla
 * PASİF + neden + "Günlük Kayıt →". Mockup metni "üretilemedi" YERİNE S11
 * "günlüğü yok" kullanılır (bu fonksiyon metni ÜRETMEZ, yalnız görünürlük/
 * etkinlik kararını verir — metin `DailyReportScreen`de).
 *
 * S12: onay YALNIZ bugün değil — `status === "draft"` olan HER gün
 * onaylanabilir (dünün raporunu bugün onaylamak olağan iştir); `status`
 * bilgisine göre "bugün mü" kontrolü YOKTUR.
 */
export function approveGate(input: ApproveGateInput): ApproveGate {
  const canApprove = hasAtLeast(input.level, "approve") && !input.siteCompleted;
  if (!canApprove || input.status !== "draft") {
    return { visible: false, disabled: false, reason: null };
  }
  if (input.draftDiaryDates.length > 0) {
    return {
      visible: true,
      disabled: true,
      reason: "Taslak (gönderilmemiş) günlük içeren günler var — önce günlüğü tamamlayın.",
    };
  }
  return { visible: true, disabled: false, reason: null };
}

/** S13: "GİR-0142" — rapor no, gün no'nun 4 haneye sıfırla doldurulmuş hâli. */
export function reportNoLabel(reportNo: number | null): string {
  if (reportNo === null) return "GİR-—";
  return `GİR-${String(reportNo).padStart(4, "0")}`;
}

/** S13: onaylı raporda "· sürüm n" eklenir; taslak/üretilemedi'de eklenmez. */
export function versionSuffix(status: EvDailyReport["status"], version: number | null): string {
  if (status !== "approved" || version === null) return "";
  return ` · sürüm ${version}`;
}

/**
 * PLN-F3.6a (lider eki) · Başlık bloğu satırı — GİR:148 "FİİL Yapı ·
 * Güneşkent Konut · A-Blok Şantiyesi" (firma · proje · şantiye). Ekran VE
 * yazdırma önizlemesi AYNI kurucuyu kullanır. Boş ("") parça ATLANIR — üçü
 * de boşsa boş dize döner (görsel olarak hiçbir şey basılmaz).
 */
export function reportEyebrow(companyName: string, projectName: string, siteName: string): string {
  return [companyName, projectName, siteName].filter((part) => part.trim() !== "").join(" · ");
}

/** `YYYY-MM-DD` → "gg.aa" (yılsız) — GİR:169 kümülatif aralık, GİR:112 eksik bant tarihleri. */
export function formatDayMonthDots(iso: string): string {
  const [, month, day] = iso.split("-");
  if (month === undefined || day === undefined) return iso;
  return `${day}.${month}`;
}

/** `YYYY-MM-DD` → "Perşembe" (TAM haftanın günü) — başlık bloğunda tarihten AYRI basılır (GİR:151, bold DEĞİL). */
export function weekdayOf(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  return TR_WEEKDAYS_LONG[date.getUTCDay()] ?? "";
}

/** GİR:150 "24.09.2026 Perşembe" — nokta tarih + TAM haftanın günü. */
export function formatReportDateHeader(iso: string): string {
  const weekday = weekdayOf(iso);
  const dotted = formatDateDots(iso);
  return weekday === "" ? dotted : `${dotted} ${weekday}`;
}

/**
 * GİR:150 "18–24.09" — hafta aralığı, YILSIZ, aynı ayda `gg–gg.aa`; farklı
 * ayda her iki uca kendi `gg.aa`sı (nadir GİR haftası, ama çökmesin).
 */
export function formatWeekRangeDots(start: string, end: string): string {
  const [, sm, sd] = start.split("-");
  const [, em, ed] = end.split("-");
  if (sm === undefined || sd === undefined || em === undefined || ed === undefined) return `${start}–${end}`;
  if (sm === em) return `${sd}–${ed}.${em}`;
  return `${sd}.${sm}–${ed}.${em}`;
}

/**
 * Türkçe "X ve Y" / "X, Y ve Z" bağlacıyla listeler — GİR:112 eksik günlük
 * bandı "21.09 ve 23.09" (virgüllü liste DEĞİL). Tek öğede aynen döner.
 */
export function joinWithVe(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} ve ${items[items.length - 1]!}`;
}

/**
 * F3.6b lider denetimi (4. tur, bölge kırpıntısı) — GİR:169 "tolerans ±2,0
 * puan": `tolerance_points` ZATEN puan ölçeğinde (`varianceStatus` ikinci
 * argümanı, bkz. `bands.test.ts` `"2.0"`), `formatVariancePoints` DEĞİL —
 * o fonksiyon 0–1 KESRİ ×100 yapar (2,0 → yanlışlıkla "200,0" üretiyordu).
 * Sabit 1 ondalık, işaretsiz (çağıran "±" ekler).
 *
 * Lider denetimi (8. tur) — ondalık kanonu: `Number(points)` + `Intl.NumberFormat`
 * YERİNE ortak `formatFixedDecimal` (`roundHalfUp`, Number YOK, null → EMPTY_CELL).
 */
export function formatToleranceLabel(points: string | null): string {
  return formatFixedDecimal(points, 1);
}
