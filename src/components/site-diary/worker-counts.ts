import {
  buildSiteDiaryWorkerCountsSave,
  siteDiaryWorkerKey,
  type SiteDiaryWorkerChange,
  type SiteDiaryWorkerKey,
} from "@/lib/api/hooks/site-diary-save-bodies";
import type {
  OwnCrewFromTimesheet,
  SiteDiaryWorkerCountRead,
  WorkerSource,
} from "@/lib/api/hooks/useSiteDiary";
import { multiplyDecimalStrings, sumDecimalStrings } from "@/lib/decimal";
import type { SiteDiaryWorkerCountInput } from "@/lib/api/hooks/useSiteDiaryMutations";

/**
 * GK414-439 → İ:344-372 · "👷 Bugünkü İşçi Dağılımı" kartının SAF türevleri.
 *
 * Backend satır kimliği firmasız satırda (`trade`, `source`) İKİLİSİ, firma
 * satırında FİRMADIR; `PATCH /diary/{entry_id}` gövdesindeki `worker_counts[]`
 * DEĞİŞTİRME semantiğinde çalışır: gönderilmeyen çift SİLİNİR.
 *
 * PLN-F2.1b · G12a (CEO kararı, seçenek A): KENDİ EKİP satırları artık günlük
 * işçi satırı DEĞİLDİR — backend puantajdan `own_crew_from_timesheet` olarak
 * türetir (salt okunur, kimlik bağı YOK, dize sezgisi YOK). Eski F-SD hazır
 * dört satırı (Kalıpçılar/Demirciler/Elektrikçiler/Yardımcı) KALKTI. Günlük
 * işçi satırları yalnız:
 *  - FİRMA satırları (`subcontractor_id` dolu; kişi × saat girilir, G10), ve
 *  - kayıtta sayısı > 0 olan FİRMASIZ satırlar — "Diğer (eski kayıt)"; sayısı
 *    düzenlenir/kaldırılır ama YENİ firmasız satır eklenemez.
 * Sayısı 0 olan firmasız satır GÖSTERİLMEZ ama gövdede AYNEN korunur
 * (`buildSiteDiaryWorkerCountsSave` kaydın TAM kümesinden kurar — veri kaybı yok).
 */

/** G12a — firmasız eski satırın ekran etiketi. */
export const LEGACY_WORKER_LABEL = "Diğer (eski kayıt)";

export interface DiaryWorkerRow {
  /** Backend `trade` (maxLength 100). */
  trade: string;
  source: WorkerSource;
  /** Firma satırı ise firma kimliği (PLN-F2.1); eski firmasız satırda YOK. */
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

/** Firmasız (eski F-SD) satır mı? */
export function isLegacyRow(row: DiaryWorkerRow): boolean {
  return row.subcontractorId === undefined;
}

/**
 * Ekranda basılacak kayıt satırları (G12a): önce FİRMA satırları (sayısından
 * bağımsız), sonra sayısı > 0 olan firmasız "eski kayıt" satırları. Sayısı 0
 * olan firmasız satır basılmaz (gövdede yine korunur — `buildWorkerCountsBody`).
 */
export function buildWorkerRows(
  entryRows: readonly SiteDiaryWorkerCountRead[] = [],
): DiaryWorkerRow[] {
  const firms = entryRows.filter((row) => row.subcontractor_id).map(toWorkerRow);
  const legacy = entryRows.filter((row) => !row.subcontractor_id && row.count > 0).map(toWorkerRow);
  return [...firms, ...legacy];
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

/** Firma satırı ekleme girdisi (G10 — `subcontractor_id` + backend `trade`). */
export interface DiaryAddedFirm {
  subcontractorId: string;
  /** Backend `trade` (zorunlu, ≤100) — firma adından türetilir. */
  trade: string;
}

/** Firma satırının `trade` tavanı (backend `maxLength` 100). */
export const DIARY_WORKER_TRADE_MAX = 100;

/**
 * Ekranın işçi satırları (PLN-F2.2 → F2.1b): kayıttaki satırlar
 * (`buildWorkerRows`) + formda EKLENEN firmalar − formda KALDIRILAN satırlar.
 * Eklenebilen YALNIZ firmadır (G12a — yeni firmasız satır yok).
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
  // Eklenen firma, kayıtlı firmaların hemen ardına (eski kayıt satırlarından önce) girer.
  const firms = base.filter(isFirmRow);
  const legacy = base.filter(isLegacyRow);
  return [...firms, ...added, ...legacy].filter((row) => !removed.has(workerCountKey(row)));
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

/** Firma satırının a-s'i = kişi × saat (İ:365 "Taşeron: kişi × saat = a-s"); hesaplanamazsa `null`. */
export function firmManHours(countText: string, hoursText: string): string | null {
  const count = parseWorkerCount(countText);
  const hours = parseWorkerHours(hoursText);
  if (count === null || !hours.valid || hours.hours === null) return null;
  return multiplyDecimalStrings(String(count), String(hours.hours));
}

export interface DiaryCrewTotals {
  /** Σ headcount + Σ günlük satır sayısı; geçersiz hücre varsa `null`. */
  people: number | null;
  /** Σ puantaj saati + Σ firma a-s; firma a-s hesaplanamıyorsa `null`. */
  manHours: string | null;
}

/**
 * İ:366-371 "Toplam" — TÜREVDİR (kullanıcı yazarken anında güncellenir).
 * Kişi = kendi ekip `headcount` + günlük satırlar (firma + eski kayıt);
 * a-s = kendi ekip `hours` + firma a-s'leri (eski satır saat taşımaz).
 */
export function diaryCrewTotals(
  ownCrew: readonly OwnCrewFromTimesheet[],
  rows: readonly DiaryWorkerRow[],
  values: Record<string, string>,
  hours: Record<string, string>,
): DiaryCrewTotals {
  const counts = rows.map((row) => parseWorkerCount(values[workerCountKey(row)] ?? ""));
  const people = counts.some((count) => count === null)
    ? null
    : ownCrew.reduce((sum, crew) => sum + crew.headcount, 0) +
      counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
  const firmAs = rows.filter(isFirmRow).map((row) => {
    const key = workerCountKey(row);
    return firmManHours(values[key] ?? "", hours[key] ?? "");
  });
  const manHours = firmAs.every((value): value is string => value !== null)
    ? sumDecimalStrings([...ownCrew.map((crew) => crew.hours), ...firmAs])
    : null;
  return { people, manHours };
}

/**
 * `PATCH` gövdesindeki `worker_counts[]` — KAYDIN satırlarından kurulan TAM
 * küme (`buildSiteDiaryWorkerCountsSave`). Ekrandaki hücreler SAYIYI (firma
 * satırında + SAATİ) değiştirir; firma kimliği kayıttan korunur. Ekranda
 * SIFIRA çekilen satır gövdeye GİRMEZ (DEĞİŞTİRME → backend'de silinir).
 * 🔴 Kayıtta olup ekranda satırı OLMAYAN satır (G12a: sayısı 0 olan gizli eski
 * satır) DÜŞMEZ, kayıttaki hâliyle AYNEN gider — yalnız AÇIKÇA kaldırılan
 * (`removedKeys`, G10) düşer.
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
