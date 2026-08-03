import type { SiteDiaryWorkerCountRead, WorkerSource } from "@/lib/api/hooks/useSiteDiary";
import type { SiteDiaryWorkerCountInput } from "@/lib/api/hooks/useSiteDiaryMutations";

/**
 * GK414-439 · "👷 Bugünkü İşçi Dağılımı" kartının SAF türevleri.
 *
 * Backend satır kimliği (`trade`, `source`) İKİLİSİDİR (UQ) ve `PATCH
 * /diary/{entry_id}` gövdesindeki `worker_counts[]` DEĞİŞTİRME semantiğinde
 * çalışır: gönderilmeyen çift SİLİNİR. Mockup'ta satır EKLE/SİL kontrolü
 * YOKTUR — satır listesi sabittir (GK418-430: Kalıpçılar/Şirket ·
 * Demirciler/Taşeron · Elektrikçiler/Taşeron · Yardımcı/Genel), yalnız SAYI
 * girilebilir. Bu yüzden kartın satırları mockup'ın bu dört çiftidir;
 * kayıtta bunlar DIŞINDA bir çift varsa (başka bir istemciden yazılmış)
 * SİLİNMEZ, listenin sonuna eklenir.
 */

/** GK418-430 — mockup'ın dört satırı, aynı sırayla. */
export const DIARY_WORKER_PRESETS: readonly DiaryWorkerRow[] = [
  { trade: "Kalıpçılar", source: "company" },
  { trade: "Demirciler", source: "subcontractor" },
  { trade: "Elektrikçiler", source: "subcontractor" },
  { trade: "Yardımcı", source: "general" },
];

export interface DiaryWorkerRow {
  /** Backend `trade` (maxLength 100). */
  trade: string;
  source: WorkerSource;
}

/** Form durumunun anahtarı — backend'in (trade, source) ikilisiyle birebir. */
export function workerCountKey(row: DiaryWorkerRow): string {
  return `${row.source}|${row.trade}`;
}

/**
 * Ekranda basılacak satırlar: mockup'ın dört ön tanımlı çifti + kayıtta olup
 * ön tanımlılarda olmayan çiftler (veri kaybı olmasın diye).
 */
export function buildWorkerRows(
  entryRows: readonly SiteDiaryWorkerCountRead[] = [],
): DiaryWorkerRow[] {
  const presetKeys = new Set(DIARY_WORKER_PRESETS.map(workerCountKey));
  const extras = entryRows
    .filter((row) => !presetKeys.has(workerCountKey(row)))
    .map((row) => ({ trade: row.trade, source: row.source }));
  return [...DIARY_WORKER_PRESETS, ...extras];
}

/**
 * Kayıttan form değerleri. `0` sayılı satır BOŞ gösterilir — mockup'ta sıfır
 * yazan hücre yoktur ve "girilmedi" ile "sıfır işçi" kullanıcı gözünde aynıdır
 * (miktar hücrelerinin `form-state.ts`teki gerekçesiyle aynı).
 */
export function workerCountsFromEntry(
  entryRows: readonly SiteDiaryWorkerCountRead[] = [],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of entryRows) {
    values[workerCountKey(row)] = row.count === 0 ? "" : String(row.count);
  }
  return values;
}

/**
 * Hücre metnini sayıya çevirir. Boş hücre `0`dır. Negatif / ondalıklı /
 * çevrilemeyen metin `null` döner — çağıran bunu görünür hataya çevirir,
 * sessizce `0` YAZMAZ (sessiz veri kaybı olurdu).
 */
export function parseWorkerCount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Geçersiz sayı girilen hücrelerin anahtarları (görünür hata için). */
export function invalidWorkerCountKeys(values: Record<string, string>): string[] {
  return Object.entries(values)
    .filter(([, value]) => parseWorkerCount(value) === null)
    .map(([key]) => key);
}

/**
 * GK434-437 "Toplam" — TÜREVDİR (backend `worker_total`ı yalnız KAYITLI
 * değerden hesaplar; kullanıcı yazarken ekrandaki sayı anında güncellenmeli).
 * Hücrelerden biri geçersizse toplam BASILMAZ (`null`).
 */
export function workerCountsTotal(
  rows: readonly DiaryWorkerRow[],
  values: Record<string, string>,
): number | null {
  let total = 0;
  for (const row of rows) {
    const parsed = parseWorkerCount(values[workerCountKey(row)] ?? "");
    if (parsed === null) return null;
    total += parsed;
  }
  return total;
}

/**
 * `PATCH` gövdesindeki `worker_counts[]`. DEĞİŞTİRME semantiği gereği SIFIR
 * olan satır gövdeye GİRMEZ — böylece backend'de silinir ve ekranda boş
 * hücre olarak yeniden basılır (ön tanımlı satırlar zaten her zaman görünür).
 * Geçersiz hücre varsa gövde ÜRETİLMEZ (`null`); çağıran kaydetmeyi durdurur.
 */
export function buildWorkerCountsBody(
  rows: readonly DiaryWorkerRow[],
  values: Record<string, string>,
): SiteDiaryWorkerCountInput[] | null {
  const body: SiteDiaryWorkerCountInput[] = [];
  for (const row of rows) {
    const parsed = parseWorkerCount(values[workerCountKey(row)] ?? "");
    if (parsed === null) return null;
    if (parsed === 0) continue;
    body.push({ trade: row.trade, source: row.source, count: parsed });
  }
  return body;
}

/** Yerel işçi değerleri kayıttakinden ayrıştı mı (`isDiaryFormDirty` payı). */
export function areWorkerCountsDirty(
  entryRows: readonly SiteDiaryWorkerCountRead[],
  rows: readonly DiaryWorkerRow[],
  values: Record<string, string>,
): boolean {
  const saved = workerCountsFromEntry(entryRows);
  const keys = new Set([...Object.keys(saved), ...rows.map(workerCountKey)]);
  for (const key of keys) {
    if (parseWorkerCount(saved[key] ?? "") !== parseWorkerCount(values[key] ?? "")) return true;
  }
  return false;
}
