import {
  resolveWorkerSourceLabel,
  WORKER_SOURCE_LABELS,
} from "@/components/site-diary/diary-labels";
import type { BadgeVariant } from "@/components/ui/badge/Badge";
import { formatCurrencyPrecise } from "@/lib/format";
import type { PersonnelListItem, WorkerSource } from "@/lib/api/hooks/usePersonnel";
import { routes } from "@/lib/routes";

/**
 * F-PT2 T2 · P — `/personel` liste ekranının etiket/rozet/pending gerekçe
 * sabitleri. Yorumlardaki sayılar `Personel.dc.html`in SATIR numaralarıdır.
 *
 * Etiket tek kaynağı `WORKER_SOURCE_LABELS` — burada YENİDEN üretilmez, ithal
 * edilir (görev emri kuralı).
 */
export { WORKER_SOURCE_LABELS, resolveWorkerSourceLabel };

/** 150/165/180/195/210/225 · "Tür" rozeti — Şirket mavi, Taşeron amber. */
export const SOURCE_BADGE_VARIANT: Record<WorkerSource, BadgeVariant> = {
  company: "primary",
  subcontractor: "warning",
  general: "neutral",
  freelance: "neutral",
  intern: "neutral",
};

/** Tanınmayan `source` — rozet NÖTR basılır (etiket `resolveWorkerSourceLabel`ten). */
export const UNKNOWN_SOURCE_BADGE_VARIANT: BadgeVariant = "neutral";

/**
 * spec K2 · dayanıklılık: İK-3 dalı enum'a `freelance`/`intern` ekliyor ve o
 * değerler şemada HENÜZ YOK. Doğrudan `SOURCE_BADGE_VARIANT[row.source]`
 * araması bilinmeyen değerde `undefined` variant döndürürdü — arama tek
 * fonksiyondan geçer, `as any` ile susturulmaz.
 */
export function resolveSourceBadgeVariant(source: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = SOURCE_BADGE_VARIANT;
  return map[source] ?? UNKNOWN_SOURCE_BADGE_VARIANT;
}

/** Avatar zemini `source`e göre TÜREVdir — mockup'ın satır başına rastgele
 * gradyanı veri taşımaz; burada anlamlı (kaynağa göre) bir gradyan seçilir. */
export const SOURCE_AVATAR_GRADIENT: Record<WorkerSource, string> = {
  company: "var(--gradient-avatar-blue)",
  subcontractor: "linear-gradient(135deg, var(--color-warning), var(--color-avatar-amber-end))",
  general: "linear-gradient(135deg, var(--color-text-muted), var(--color-avatar-slate-end))",
  freelance: "linear-gradient(135deg, var(--color-text-muted), var(--color-avatar-slate-end))",
  intern: "linear-gradient(135deg, var(--color-text-muted), var(--color-avatar-slate-end))",
};

/** spec K2 · tanınmayan `source` — avatar zemini nötr (`general`) gradyana düşer. */
export function resolveSourceAvatarGradient(source: string): string {
  const map: Record<string, string> = SOURCE_AVATAR_GRADIENT;
  return map[source] ?? SOURCE_AVATAR_GRADIENT.general;
}

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

/**
 * F-İK T2 · P 135 — Proje hücresi. Sunucu `assigned_project_id` (UUID) verir,
 * AD vermez; ad proje listesinden eşlenir. Liste yüklenemezse kimliği ham
 * basmak veri değil gürültü olurdu — hücre bu gerekçeyle pending'e düşer.
 *
 * ⚠️ "Atanmamış" (id `null`) bundan AYRIDIR: o GERÇEK bir boşluktur, sade "—"
 * basar ve gerekçe TAŞIMAZ.
 */
export const PROJECT_NAME_PENDING_REASON =
  "Proje adları yüklenemedi — kayıttaki proje kimliği ad olarak gösterilemiyor.";

/** KPI şeridi 4-6: Sahada Aktif/İzinde/Aylık Maliyet — backend hiç vermiyor. */
export const KPI_ON_SITE_PENDING_REASON =
  "Sahada aktiflik takibi bu sürümde yok; personel kaydı bu bilgiyi taşımıyor.";
export const KPI_ON_LEAVE_PENDING_REASON =
  "İzin takibi bu sürümde yok; personel kaydı bu bilgiyi taşımıyor.";
export const KPI_MONTHLY_COST_PENDING_REASON =
  "Aylık maliyet hesabı bu sürümde yok; sunucu personel maliyeti toplamı vermiyor.";

/** "İzinde" durum seçeneği — `is_active`e sessizce eşlenmez (veri yalanı olur). */
export const STATUS_ON_LEAVE_PENDING_REASON =
  "İzin durumu backend'de henüz yok; bu seçenek aktif/pasif ile karıştırılamaz.";

/** "Dışa Aktar" — dışa aktarma ucu yok (spec K5). */
export const EXPORT_PENDING_REASON = "Dışa aktarma ucu backend'de henüz yok.";

/**
 * P 74/85 · Belge & Sertifika ekranının rotası. Sekme şeridi VE uyarı bandının
 * "Belgeleri Gör →" düğmesi AYNI sabiti kullanır — ekran T5'te yazılır, link
 * şimdiden gerçektir (rota tek yerde tanımlı olsun).
 */
export const HR_DOCUMENTS_ROUTE = routes.personnel.documents();

/**
 * F-IZN T3/T5 · İzin Yönetimi ekranının rotası. Sekme şeridi bu sabiti
 * kullanır (rota tek yerde tanımlı olsun — `HR_DOCUMENTS_ROUTE` emsali).
 */
export const LEAVES_ROUTE = routes.personnel.leaves();

/**
 * P 80-86 · uyarı bandı metni. ŞEF KARARI: sunucu (`GET /hr/documents/summary`)
 * BELGE sayısı verir; mockup'ın "N personelin…" ifadesinin sunucuda karşılığı
 * YOKTUR — personel sayısı UYDURULMAZ, cümle belge sayısı üzerinden kurulur.
 *
 * İki sayaç da 0 ise `null` döner: bant HİÇ basılmaz (uyarılacak bir şey yok).
 */
export function buildDocumentAlertText(counts: {
  expired: number;
  expiring: number;
}): string | null {
  const parts: string[] = [];
  if (counts.expired > 0) parts.push(`${counts.expired} belgenin süresi doldu`);
  if (counts.expiring > 0) parts.push(`${counts.expiring} belgenin süresi yaklaşıyor`);
  if (parts.length === 0) return null;
  return `${parts.join(" · ")} — İSG mevzuatı gereği bu belgeler yenilenmeden sahada çalışılamaz.`;
}

/** 154 · Ücret/Gün sütununun birim ekleri — `daily` sade tutar basar. */
export const WAGE_TYPE_SUFFIX: Record<NonNullable<PersonnelListItem["wage_type"]>, string> = {
  daily: "",
  monthly: " / Ay",
  hourly: " / Saat",
};

/**
 * 137/154 · "Ücret/Gün" hücresi. ŞEF KARARI: sütun başlığı mockup'tan
 * DEĞİŞMEZ ama sunucudaki tutar her zaman GÜNLÜK değildir (`wage_type`
 * ayrı alandır) — aylık/saatlik ücreti başlıksız basmak YANILTIRDI, bu yüzden
 * tutarın yanına birim eki konur. Tutar yoksa "—" (uydurma sıfır YOK).
 *
 * Bilinmeyen bir `wage_type` (şema büyürse) ek BASMAZ; tutar yine de görünür.
 */
export function formatWageCell(item: {
  wage_amount: string | null;
  wage_type: PersonnelListItem["wage_type"];
}): string {
  if (item.wage_amount === null) return PENDING_VALUE;
  const suffixes: Record<string, string> = WAGE_TYPE_SUFFIX;
  const suffix = item.wage_type === null ? "" : (suffixes[item.wage_type] ?? "");
  return `${formatCurrencyPrecise(item.wage_amount)}${suffix}`;
}

/*
 * `TAB_PENDING_REASON` (72-77 · rotasız İK sekmelerinin gerekçesi) F-BOR
 * T5'te KALDIRILDI: şeridin son iki rotasız sekmesi ("Bordro" / "SGK")
 * `/bordro` ve `/bordro/sgk` ekranları yazıldığı için gerçek rotaya bağlandı,
 * geriye gerekçe basılacak sekme kalmadı.
 */
