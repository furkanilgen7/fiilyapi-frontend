import {
  formatWageCell,
  PROJECT_NAME_PENDING_REASON,
  resolveSourceAvatarGradient,
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
} from "@/components/personnel/personnel-list-labels";
import { formatDateDots } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";

/**
 * F-PT2 T3 / F-İK T3 · PD — `/personel/[id]` detay ekranının etiket/rozet/
 * pending gerekçe sabitleri. Yorumlardaki sayılar `Personel Detay.dc.html`in
 * SATIR numaralarıdır.
 *
 * Rozet/etiket/biçimlendirici yardımcıları T2'nin `personnel-list-labels.ts`
 * ve ortak `lib/format.ts`ten AYNEN ithal edilir — ikinci bir kaynak YOK
 * (görev emri kuralı). `resolveSourceBadgeVariant`/`resolveWorkerSourceLabel`
 * KULLANILIR (spec K2 dayanıklılığı) — ham `Record[source]` erişimi YOK,
 * İK-3'ün `freelance`/`intern` gibi henüz şemada olmayan değerleri ekranı
 * çökertmesin diye.
 */
export {
  formatWageCell,
  PROJECT_NAME_PENDING_REASON,
  resolveSourceAvatarGradient,
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
};

export const PENDING_VALUE = "—";

/**
 * F-İK T3 · `İşe Giriş` şerit hücresi (PD 58). `null` ⇒ gerçek boşluk "—".
 * Mevcut `formatDateDots` (`YYYY-MM-DD` → "01.03.2025") AYNEN kullanılır —
 * yeni bir tarih biçimlendirici YAZILMAZ (görev emri kuralı).
 */
export function formatHireDate(hireDate: string | null): string {
  return hireDate === null ? PENDING_VALUE : formatDateDots(hireDate);
}

/**
 * F-İK T3 · IBAN maskeleme (PD 61, spec K5): mockup `TR12 0001 0093...`
 * gösterir — TAM değer bu ekranda BASILMAZ, yalnız düzenleme formunda
 * görünür. Boşluklar önce temizlenir (sunucu boşluksuz saklar), ilk 3 blok
 * (4'erli) boşlukla gruplanır; girdi 12 karakterden uzunsa "..." eklenir.
 * `null` ⇒ gerçek boşluk "—".
 */
export function maskIban(iban: string | null): string {
  if (iban === null) return PENDING_VALUE;
  const clean = iban.replace(/\s+/g, "");
  const groups = clean.match(/.{1,4}/g)?.slice(0, 3) ?? [];
  const prefix = groups.join(" ");
  return clean.length > 12 ? `${prefix}...` : prefix;
}

/** PD 60 · "Vergi No" — sunucuda alan YOK (İK-1 sözleşmesinde `tax_no` yok). */
export const TAX_NO_PENDING_REASON =
  "Vergi No alanı sunucuda henüz yok — bu sürümün İK sözleşmesi bu alanı taşımıyor.";

/** 66-86 · "Puantaj Özeti" — kişi-bazlı puantaj özeti ucu YOK (spec K4). */
export const TIMESHEET_SUMMARY_PENDING_REASON =
  "Personel bazlı puantaj özeti ucu backend'de henüz yok — bu kart hiçbir ek sorgu atmaz.";

/** 88-113 · "İzin & Haklar" — İK dilimi. */
export const LEAVE_PENDING_REASON = "İzin ve hak takibi İnsan Kaynakları dilimiyle birlikte gelir.";

/** 115-128 · "Proje Geçmişi" — İK dilimi. */
export const PROJECT_HISTORY_PENDING_REASON =
  "Proje geçmişi takibi İnsan Kaynakları dilimiyle birlikte gelir.";

/**
 * 130-141 · "Belgeler" — F-İK T5'te kart GERÇEK listeye döndü
 * (`GET /personnel/{id}/documents`); kartın kendi gerekçe sabitleri artık
 * `@/components/hr-documents/hr-documents-labels`tedir (ekleme formu mockup'ı
 * yok · indirme ayrı sözleşme). Bu sabit yalnız BC-2 form-slot'unun ortak
 * modül etiketi olarak KALIR.
 */
export const DOCUMENTS_PENDING_REASON = pendingModuleLabel("documents");

/** 23 · "Bordroyu Gör" — bordro/maaş ucu yok. */
export const PAYROLL_PENDING_REASON = "Bordro modülü henüz eklenmedi.";

/** 22 · "Düzenle" — GERÇEK, `/personel/[id]/duzenle`e gider. */
export const EDIT_HREF_SUFFIX = "/duzenle";

/** 70 · "Tümü →" — GERÇEK, genel puantaj ekranına gider (spec §1). */
export const TIMESHEET_ALL_HREF = "/puantaj";
