import { hasAtLeast, type AccessLevel } from "@/lib/auth/permissions";
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
