import type { SectionCreateRequest } from "@/lib/api/hooks/useSectionMutations";
import type { SectionFormValues } from "./form-state";

/** Boş/boşluk metin → `null` (site-form/build-body.ts deseniyle aynı). */
export function textOrNull(value: string): string | null {
  return value.trim() || null;
}

/** Boş → `null`; sayı olmayan → `null` (doğrulama ayrı katmandadır). `0` GEÇERLİDİR. */
export function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `POST /sites/{site_id}/sections` VE `PATCH /sections/{section_id}` gövdesi
 * — saf fonksiyon (brief §Kanıt yükümlülüğü, `site-form/build-body.ts`
 * deseni). `SectionCreateRequest` dönse de yapısal olarak `SectionUpdateRequest`
 * ile uyumludur (tüm alanlar orada da vardır, yalnız `site_id` yoktur — o zaten
 * hiç üretilmez).
 *
 * Bilinçli olarak ÜRETİLMEYENLER (brief §Mockup'ta olup backend'i OLMAYAN
 * kartlar — hiçbiri buraya alan sızdırmaz):
 * - `manager_name` / `deputy_manager_name` — formda serbest metin karşılığı
 *   YOKTUR (yalnız kullanıcı seçici basılır, site-form/user-picker deseni).
 *   Düzenleme kipinde eski (yalnız-isim) kayıtları PATCH ile SESSİZCE
 *   silmemek için bu iki alan HİÇ gönderilmez — dokunulmayan alan PATCH'te
 *   olduğu gibi kalır.
 * - Görevli Taşeronlar / Kullanılacak Makineler (F88-98) — devre dışı kart,
 *   backend alanı yok.
 * - Bağımlılık / Milestone / Gantt checkbox (F115-123, F237) — devre dışı,
 *   →P11.
 * - Bölüm Belgeleri (F214-233) — yükleme yok, gövde alanı yok.
 * - Bölüme Atanacak İş Kalemleri (F131-211) — kalıcı karar 1, veri katmanında
 *   kapalı.
 * - `duration_days` (F109) — türev, saklanmaz.
 * - `site_id` — yol parametresidir, gövdeye ayrı alan olarak GİTMEZ.
 */
export function buildSectionBody(
  values: SectionFormValues,
  { isDraft }: { isDraft: boolean },
): SectionCreateRequest {
  const code = values.code.trim();

  return {
    name: values.name.trim(),
    // Kod boşsa anahtar HİÇ gönderilmez: sunucu `BLM-NN` üretir (F68).
    ...(code ? { code } : {}),
    sort_order: numberOrNull(values.sortOrder) ?? 0,
    section_type: values.sectionType || null,
    status: values.status,
    description: textOrNull(values.description),
    manager_user_id: values.managerUserId || null,
    deputy_manager_user_id: values.deputyManagerUserId || null,
    planned_worker_count: numberOrNull(values.plannedWorkerCount),
    start_date: textOrNull(values.startDate),
    end_date: textOrNull(values.endDate),
    budget_amount: numberOrNull(values.budgetAmount),
    is_draft: isDraft,
  };
}
