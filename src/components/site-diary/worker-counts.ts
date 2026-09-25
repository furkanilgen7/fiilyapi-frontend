import {
  buildSiteDiaryWorkerCountsSave,
  siteDiaryWorkerKey,
  type SiteDiaryWorkerChange,
  type SiteDiaryWorkerKey,
} from "@/lib/api/hooks/site-diary-save-bodies";
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
 *
 * PLN-F2.1: firma (taşeron) satırı (`subcontractor_id` dolu) kimliğini
 * FİRMADAN alır — ön tanımlı "Demirciler/Taşeron" hücresiyle ÇAKIŞMAZ, kendi
 * satırı olarak eklenir. Gövde `buildSiteDiaryWorkerCountsSave` ile KAYDIN
 * satırlarından kurulur: firma satırı + saati ekranda düzenlenmese de korunur.
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
  /** Firma satırı ise firma kimliği (PLN-F2.1); ön tanımlılarda YOK. */
  subcontractorId?: string;
}

/**
 * Form durumunun anahtarı — backend kimliğiyle birebir: firmasız satırda
 * (kaynak, meslek), firma satırında firma.
 */
export function workerCountKey(row: DiaryWorkerRow): SiteDiaryWorkerKey {
  return siteDiaryWorkerKey({ trade: row.trade, source: row.source, subcontractor_id: row.subcontractorId });
}

/** Kayıt satırının anahtarı (`subcontractor_id` alanı adıyla). */
function entryRowKey(row: SiteDiaryWorkerCountRead): SiteDiaryWorkerKey {
  return siteDiaryWorkerKey(row);
}

function toWorkerRow(row: SiteDiaryWorkerCountRead): DiaryWorkerRow {
  return row.subcontractor_id
    ? { trade: row.trade, source: row.source, subcontractorId: row.subcontractor_id }
    : { trade: row.trade, source: row.source };
}

/**
 * Ekranda basılacak satırlar: mockup'ın dört ön tanımlı çifti + kayıtta olup
 * ön tanımlılarda olmayan çiftler (veri kaybı olmasın diye).
 */
export function buildWorkerRows(
  entryRows: readonly SiteDiaryWorkerCountRead[] = [],
): DiaryWorkerRow[] {
  const presetKeys = new Set(DIARY_WORKER_PRESETS.map(workerCountKey));
  const extras = entryRows.filter((row) => !presetKeys.has(entryRowKey(row))).map(toWorkerRow);
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
    values[entryRowKey(row)] = row.count === 0 ? "" : String(row.count);
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

/** Firma satırı ekleme girdisi (G10 — `subcontractor_id` + backend `trade`). */
export interface DiaryAddedFirm {
  subcontractorId: string;
  /** Backend `trade` (zorunlu, ≤100) — firma adından türetilir. */
  trade: string;
}

/** Firma satırının `trade` tavanı (backend `maxLength` 100). */
export const DIARY_WORKER_TRADE_MAX = 100;

/**
 * Ekranın işçi satırları (PLN-F2.2): kayıttaki satırlar (`buildWorkerRows`)
 * + formda EKLENEN firmalar − formda KALDIRILAN satırlar.
 */
export function buildDiaryWorkerRows(
  entryRows: readonly SiteDiaryWorkerCountRead[],
  addedFirms: readonly DiaryAddedFirm[],
  removedKeys: readonly SiteDiaryWorkerKey[],
): DiaryWorkerRow[] {
  const base = buildWorkerRows(entryRows);
  const present = new Set(base.map(workerCountKey));
  const added = addedFirms
    .map((firm): DiaryWorkerRow => ({
      trade: firm.trade.slice(0, DIARY_WORKER_TRADE_MAX),
      source: "subcontractor",
      subcontractorId: firm.subcontractorId,
    }))
    .filter((row) => !present.has(workerCountKey(row)));
  const removed = new Set(removedKeys);
  return [...base, ...added].filter((row) => !removed.has(workerCountKey(row)));
}

/** Firma satırı mı (kişi × saat girilir)? */
export function isFirmRow(row: DiaryWorkerRow): boolean {
  return row.subcontractorId !== undefined;
}

/** Backend `hours`: 0 < h ≤ 24, bir ondalık (`schemas.py` `_HOURS_MAX`). */
export const DIARY_WORKER_HOURS_MAX = 24;

/**
 * Firma saat hücresi: boş = saat YOK (`null`); dolu ise 0 < h ≤ 24, en çok
 * bir ondalık (TR virgülü kabul). Aralık dışı / anlamsız metin GEÇERSİZDİR —
 * sessizce `null` yazılmaz (backend 422'sini ağa çıkmadan yakalar).
 */
export function parseWorkerHours(value: string): { valid: boolean; hours: number | null } {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return { valid: true, hours: null };
  if (!/^\d+(\.\d)?$/.test(trimmed)) return { valid: false, hours: null };
  const hours = Number(trimmed);
  if (hours <= 0 || hours > DIARY_WORKER_HOURS_MAX) return { valid: false, hours: null };
  return { valid: true, hours };
}

/** Geçersiz saat girilen hücrelerin anahtarları. */
export function invalidWorkerHourKeys(values: Record<string, string>): string[] {
  return Object.entries(values)
    .filter(([, value]) => !parseWorkerHours(value).valid)
    .map(([key]) => key);
}

/**
 * `PATCH` gövdesindeki `worker_counts[]` — KAYDIN satırlarından kurulan TAM
 * küme (`buildSiteDiaryWorkerCountsSave`). Ekrandaki hücreler SAYIYI (firma
 * satırında + SAATİ) değiştirir; firma kimliği kayıttan korunur. SIFIR olan
 * satır gövdeye GİRMEZ (DEĞİŞTİRME → backend'de silinir, ekranda boş hücre
 * olarak yeniden basılır). Kayıtta olup ekranda satırı OLMAYAN satır DÜŞMEZ —
 * yalnız AÇIKÇA kaldırılan (`removedKeys`, G10) düşer.
 * Geçersiz hücre varsa gövde ÜRETİLMEZ (`null`); çağıran kaydetmeyi durdurur.
 */
export function buildWorkerCountsBody(
  entryRows: readonly SiteDiaryWorkerCountRead[],
  rows: readonly DiaryWorkerRow[],
  values: Record<string, string>,
  hours: Record<string, string> = {},
  removedKeys: readonly SiteDiaryWorkerKey[] = [],
): SiteDiaryWorkerCountInput[] | null {
  const savedKeys = new Set(entryRows.map(entryRowKey));
  const savedHoursByKey = new Map(entryRows.map((row) => [entryRowKey(row), row.hours ?? null]));
  const changes: Record<SiteDiaryWorkerKey, SiteDiaryWorkerChange> = {};
  const removed: SiteDiaryWorkerKey[] = [...removedKeys];
  const added: SiteDiaryWorkerCountInput[] = [];
  for (const row of rows) {
    const key = workerCountKey(row);
    const count = parseWorkerCount(values[key] ?? "");
    if (count === null) return null;
    // Saat hücresi formda YOKSA saat kayıttan korunur (dokunulmaz).
    const firmHours = isFirmRow(row) && key in hours ? parseWorkerHours(hours[key] ?? "") : null;
    if (firmHours !== null && !firmHours.valid) return null;
    // Değişmeyen saat kayıttaki YAZIMIYLA kalır ("9.0" → 9 diye yeniden yazılmaz).
    const savedHours = savedHoursByKey.get(key);
    const isHoursUnchanged =
      firmHours === null || (savedHours !== undefined && parseWorkerHours(savedHours ?? "").hours === firmHours.hours);
    const change: SiteDiaryWorkerChange = isHoursUnchanged ? { count } : { count, hours: firmHours.hours };
    if (count === 0) {
      removed.push(key);
    } else if (savedKeys.has(key)) {
      changes[key] = change;
    } else {
      added.push({
        trade: row.trade,
        source: row.source,
        count,
        subcontractor_id: row.subcontractorId ?? null,
        hours: firmHours?.hours ?? null,
      });
    }
  }
  return buildSiteDiaryWorkerCountsSave(entryRows, { changes, added, removed });
}

/** Kayıttan firma saat değerleri (firma satırı dışında saat girilmez). */
export function workerHoursFromEntry(
  entryRows: readonly SiteDiaryWorkerCountRead[] = [],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of entryRows) {
    if (row.subcontractor_id) values[entryRowKey(row)] = row.hours ?? "";
  }
  return values;
}

/** Yerel işçi değerleri kayıttakinden ayrıştı mı (`isDiaryFormDirty` payı). */
export function areWorkerCountsDirty(
  entryRows: readonly SiteDiaryWorkerCountRead[],
  rows: readonly DiaryWorkerRow[],
  values: Record<string, string>,
  hours: Record<string, string> = {},
): boolean {
  const saved = workerCountsFromEntry(entryRows);
  const keys = new Set([...Object.keys(saved), ...rows.map(workerCountKey)]);
  for (const key of keys) {
    if (parseWorkerCount(saved[key] ?? "") !== parseWorkerCount(values[key] ?? "")) return true;
  }
  const savedHours = workerHoursFromEntry(entryRows);
  const hourKeys = new Set([...Object.keys(savedHours), ...Object.keys(hours)]);
  for (const key of hourKeys) {
    if (parseWorkerHours(savedHours[key] ?? "").hours !== parseWorkerHours(hours[key] ?? "").hours) {
      return true;
    }
  }
  return false;
}
