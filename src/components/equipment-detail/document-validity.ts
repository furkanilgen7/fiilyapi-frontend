import type { BadgeVariant } from "@/components/ui/badge/Badge";

/**
 * F-MKD · Belgeler tablosunun `Durum` sütunu (MD:191-193 · 200 · 209 · 218).
 *
 * ## Niçin İSTEMCİDE türer — ve niçin `as_of`a bağlıdır
 *
 * 🔴 `GET /equipment/{id}/documents` (`EquipmentDocumentResponse`) bir DURUM
 * ALANI TAŞIMAZ: yalnız `valid_until` döner. Sunucunun bu eşiği bildiği tek
 * yer `GET /equipment/documents/summary`tir ve o uç bu ekran için
 * KULLANILAMAZ — sorgu gövdesinden ölçüldü
 * (`document_repository.list_active_document_rows_for_summary`):
 *
 * * FİLO GENELİDİR (tek ekipmana süzülemez, `equipment_id` parametresi yok),
 * * `.where(Equipment.is_active.is_(True))` taşır → **kullanımdan kaldırılmış
 *   bir ekipmanın belgeleri o yanıtta HİÇ YOKTUR.** Detay ekranı pasif
 *   ekipmanda da açılır; o ucu bekçi yapsaydık pasif makinenin süresi dolmuş
 *   belgesi ekranda "Geçerli" görünürdü.
 *
 * Bu yüzden durum burada türer ama gün SUNUCUNUNDUR: karşılaştırma tabanı
 * `GET /equipment/{id}/detail` yanıtının `as_of` damgasıdır, `new Date()`
 * DEĞİL. İstemci saati kullanılsaydı tarayıcı saat dilimi sınır günlerde
 * (bugün / +30) rozeti oynatır ve görsel kapı da her koşuda başka kare
 * üretirdi.
 *
 * Eşik `EXPIRING_SOON_DAYS = 30`un aynasıdır (`document_service.py:43`) ve
 * sınır günler DÂHİLDİR (`today <= valid_until <= today + 30`) — sunucunun
 * özet ucuyla aynı cümleyi kursun diye birebir kopyalanmıştır. AYNASININ
 * BAYATLAMASI bir borçtur; rapora yazıldı.
 */
export const DOCUMENT_EXPIRING_SOON_DAYS = 30;

export type DocumentValidity = "perpetual" | "valid" | "expiring" | "expired";

export interface DocumentValidityResult {
  kind: DocumentValidity;
  label: string;
  variant: BadgeVariant;
  /** `expiring`/`expired` için gün farkı; ötekilerde `null`. */
  days: number | null;
}

/** `YYYY-MM-DD` → UTC gün sayısı. `new Date(iso)` ile ayrıştırma yapılmaz
 *  (`parseDateDots` ile aynı gerekçe: yerel saat/DST günü kaydırır). */
function toUtcDays(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/**
 * @param validUntil belgenin geçerlilik sonu (`null` ⇒ süresiz)
 * @param asOf `EquipmentDetailResponse.as_of` — SUNUCUNUN günü
 */
export function documentValidity(
  validUntil: string | null,
  asOf: string,
): DocumentValidityResult {
  if (validUntil === null) {
    // MD:193 `Süresiz` — nötr, çünkü bir uyarı DEĞİL bir olgudur.
    return { kind: "perpetual", label: "Süresiz", variant: "neutral", days: null };
  }

  const until = toUtcDays(validUntil);
  const today = toUtcDays(asOf);
  // Ayrıştırılamayan tarihte UYDURMA "Geçerli" BASILMAZ (fail-closed): tarih
  // metni sütunda zaten görünür, rozet bilinmezliği söyler.
  if (until === null || today === null) {
    return { kind: "perpetual", label: "—", variant: "neutral", days: null };
  }

  const days = until - today;
  if (days < 0) {
    return { kind: "expired", label: "Süresi doldu", variant: "danger", days: -days };
  }
  if (days <= DOCUMENT_EXPIRING_SOON_DAYS) {
    // MD:200 `25 gün kaldı`.
    return { kind: "expiring", label: `${days} gün kaldı`, variant: "warning", days };
  }
  // MD:193 `Geçerli`.
  return { kind: "valid", label: "Geçerli", variant: "success", days: null };
}
