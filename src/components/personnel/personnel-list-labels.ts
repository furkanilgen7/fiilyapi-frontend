import { WORKER_SOURCE_LABELS } from "@/components/site-diary/diary-labels";
import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { WorkerSource } from "@/lib/api/hooks/usePersonnel";

/**
 * F-PT2 T2 · P — `/personel` liste ekranının etiket/rozet/pending gerekçe
 * sabitleri. Yorumlardaki sayılar `Personel.dc.html`in SATIR numaralarıdır.
 *
 * Etiket tek kaynağı `WORKER_SOURCE_LABELS` — burada YENİDEN üretilmez, ithal
 * edilir (görev emri kuralı).
 */
export { WORKER_SOURCE_LABELS };

/** 150/165/180/195/210/225 · "Tür" rozeti — Şirket mavi, Taşeron amber. */
export const SOURCE_BADGE_VARIANT: Record<WorkerSource, BadgeVariant> = {
  company: "primary",
  subcontractor: "warning",
  general: "neutral",
};

/** Avatar zemini `source`e göre TÜREVdir — mockup'ın satır başına rastgele
 * gradyanı veri taşımaz; burada anlamlı (kaynağa göre) bir gradyan seçilir. */
export const SOURCE_AVATAR_GRADIENT: Record<WorkerSource, string> = {
  company: "var(--gradient-avatar-blue)",
  subcontractor: "linear-gradient(135deg, var(--color-warning), var(--color-avatar-amber-end))",
  general: "linear-gradient(135deg, var(--color-text-muted), var(--color-avatar-slate-end))",
};

/** 155/170/185/200/230 · "Durum" rozeti — yalnız `is_active` GERÇEĞİ. */
export const STATUS_BADGE_VARIANT: Record<"active" | "inactive", BadgeVariant> = {
  active: "success",
  inactive: "neutral",
};
export const STATUS_LABEL: Record<"active" | "inactive", string> = {
  active: "Aktif",
  inactive: "Pasif",
};

/** Değer basılamayan hücre/kart için ortak yer tutucu. */
export const PENDING_VALUE = "—";

/** K1 · SGK/Ücret-Gün/Proje sütunları — sözleşmede alan yok (zarif düşüş). */
export const COLUMN_PENDING_REASON =
  "Bu bilgi personel kaydında henüz yok — sözleşme bu alanı taşımıyor.";

/** KPI şeridi 4-6: Sahada Aktif/İzinde/Aylık Maliyet — backend hiç vermiyor. */
export const KPI_ON_SITE_PENDING_REASON =
  "Sahada aktiflik takibi bu sürümde yok; personel kaydı bu bilgiyi taşımıyor.";
export const KPI_ON_LEAVE_PENDING_REASON =
  "İzin takibi bu sürümde yok; personel kaydı bu bilgiyi taşımıyor.";
export const KPI_MONTHLY_COST_PENDING_REASON =
  "Aylık maliyet hesap bu sürümde yok; ücret/gün bilgisi personel kaydında yok.";

/** Proje süzgeci — backend `GET /personnel` bu parametreyi almıyor (spec K-B). */
export const PROJECT_FILTER_PENDING_REASON = "Proje süzgeci backend'de henüz yok.";

/** "İzinde" durum seçeneği — `is_active`e sessizce eşlenmez (veri yalanı olur). */
export const STATUS_ON_LEAVE_PENDING_REASON =
  "İzin durumu backend'de henüz yok; bu seçenek aktif/pasif ile karıştırılamaz.";

/** "Dışa Aktar" — dışa aktarma ucu yok (spec K5). */
export const EXPORT_PENDING_REASON = "Dışa aktarma ucu backend'de henüz yok.";

/** Uyarı bandı (80-86) — İK-Belge takibi. Sahte sayı BASILMAZ. */
export const DOCUMENT_ALERT_PENDING_REASON =
  "Sağlık raporu ve İSG eğitimi süre takibi bu sürümde yok — Belge & Sertifika modülüyle birlikte gelecek.";

/** 72-77 · rotasız İK sekmeleri (kalıcı kural: silinmez, devre-dışı basılır). */
export const TAB_PENDING_REASON = "Bu ekran henüz yazılmadı.";
