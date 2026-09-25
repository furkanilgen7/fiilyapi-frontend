import type { SiteDiaryLineRead, SiteDiaryWorkerCountRead, WorkerSource } from "./useSiteDiary";
import type {
  SiteDiaryLineInput,
  SiteDiaryLinesSave,
  SiteDiaryWorkerCountInput,
} from "./useSiteDiaryMutations";

/**
 * PLN-F2.1 · Günlük DEĞİŞTİRME gövdelerinin TAM KÜME üreticileri (çekirdek —
 * planlama import YOK, spec §2.7).
 *
 * `PUT /diary/{id}/lines` ve `PATCH /diary/{id}` içindeki `worker_counts[]`
 * gövdede GEÇMEYEN satırı SİLER. Bu yüzden gövde kaydın KENDİ satırlarından
 * kurulur: bölümlü satırlar, Bölümsüz iskelet ve firma (taşeron) satırları
 * HER ZAMAN girer; yalnız AÇIKÇA kaldırılan (`removed`) düşer. Ekranın
 * gösterdiği alt küme gövdeyi BELİRLEMEZ — kısmi küme = sessiz veri kaybı
 * (PLN-F2 plan §0).
 *
 * Yeni anahtarlar (`section_id`, `overrun_reason`, `subcontractor_id`,
 * `hours`) değer `null` olsa da AÇIKÇA yazılır: backend B2.x-A bekçisi
 * "hiçbir satır bu anahtarı taşımıyorsa B2 öncesi istemci" deyip 409 döner.
 * `undefined` JSON'da düşer, `null` düşmez.
 */

/** `SiteDiaryLinesSave`in `lines`ı HER ZAMAN dolu hâli (boş gövde "hepsini sil" demektir). */
export type SiteDiaryFullLinesSave = SiteDiaryLinesSave & { lines: SiteDiaryLineInput[] };

/** Poz satırının kimliği — (kalem, bölüm | Bölümsüz). */
export type SiteDiaryLineKey = string;

export function siteDiaryLineKey(boqItemId: string, sectionId: string | null | undefined): SiteDiaryLineKey {
  return `${boqItemId}|${sectionId ?? ""}`;
}

/** Var olan (ya da eklenen) satırda değişen alanlar; verilmeyen alan korunur. */
export interface SiteDiaryLineChange {
  quantity?: SiteDiaryLineInput["quantity"];
  /** `null` gerekçeyi TEMİZLER; `undefined` dokunmaz. */
  overrunReason?: string | null;
}

export interface SiteDiaryLinesPlan {
  changes?: Readonly<Record<SiteDiaryLineKey, SiteDiaryLineChange>>;
  /** Yeni satırlar (ör. "+ Bölüm"). Kayıtta aynı anahtar varsa onun YERİNİ alır. */
  added?: readonly SiteDiaryLineInput[];
  /** Kullanıcının AÇIKÇA kaldırdığı satırlar (G6) — yalnız bunlar düşer. */
  removed?: readonly SiteDiaryLineKey[];
}

function applyLineChange(row: SiteDiaryLineInput, change: SiteDiaryLineChange | undefined): SiteDiaryLineInput {
  if (!change) return row;
  return {
    ...row,
    quantity: change.quantity ?? row.quantity,
    overrun_reason: change.overrunReason === undefined ? row.overrun_reason : change.overrunReason,
  };
}

function normalizeLine(input: SiteDiaryLineInput): SiteDiaryLineInput {
  return {
    boq_item_id: input.boq_item_id,
    section_id: input.section_id ?? null,
    quantity: input.quantity,
    overrun_reason: input.overrun_reason ?? null,
  };
}

/**
 * `PUT /diary/{id}/lines` gövdesi: kayıttaki bütün satırlar (sırası korunur)
 * + eklenenler, eksi AÇIKÇA kaldırılanlar. Bağı kopmuş satır (`boq_item_id`
 * null) adreslenemez — backend onu düşürür ve `dropped_orphan_count` ile
 * bildirir.
 */
export function buildSiteDiaryLinesSave(
  saved: readonly SiteDiaryLineRead[],
  plan: SiteDiaryLinesPlan = {},
): SiteDiaryFullLinesSave {
  const removed = new Set(plan.removed ?? []);
  const changes = plan.changes ?? {};
  const rows = new Map<SiteDiaryLineKey, SiteDiaryLineInput>();

  for (const line of saved) {
    if (line.boq_item_id === null) continue;
    const key = siteDiaryLineKey(line.boq_item_id, line.section_id);
    const base = normalizeLine({
      boq_item_id: line.boq_item_id,
      section_id: line.section_id,
      quantity: line.quantity,
      overrun_reason: line.overrun_reason,
    });
    rows.set(key, applyLineChange(base, changes[key]));
  }
  for (const input of plan.added ?? []) {
    const key = siteDiaryLineKey(input.boq_item_id, input.section_id);
    rows.set(key, applyLineChange(normalizeLine(input), changes[key]));
  }

  return { lines: [...rows].filter(([key]) => !removed.has(key)).map(([, row]) => row) };
}

/** İşçi satırının kimliği: firma satırında FİRMA, değilse (kaynak, meslek). */
export type SiteDiaryWorkerKey = string;

/** Firma kimliğinin öneki — `WorkerSource` üyesi değildir, çakışamaz. */
const FIRM_KEY_PREFIX = "firm";

export function siteDiaryWorkerKey(row: {
  trade: string;
  source: WorkerSource;
  subcontractor_id?: string | null;
}): SiteDiaryWorkerKey {
  return row.subcontractor_id ? `${FIRM_KEY_PREFIX}|${row.subcontractor_id}` : `${row.source}|${row.trade}`;
}

export interface SiteDiaryWorkerChange {
  count?: number;
  /** `null` saati TEMİZLER; `undefined` dokunmaz. */
  hours?: SiteDiaryWorkerCountInput["hours"];
}

export interface SiteDiaryWorkerCountsPlan {
  changes?: Readonly<Record<SiteDiaryWorkerKey, SiteDiaryWorkerChange>>;
  /** Yeni satırlar (ör. firma ekle). Kayıtta aynı kimlik varsa onun YERİNİ alır. */
  added?: readonly SiteDiaryWorkerCountInput[];
  /** AÇIKÇA kaldırılan satırlar — yalnız bunlar düşer. */
  removed?: readonly SiteDiaryWorkerKey[];
}

function normalizeWorker(input: SiteDiaryWorkerCountInput): SiteDiaryWorkerCountInput {
  return {
    trade: input.trade,
    source: input.source,
    count: input.count,
    subcontractor_id: input.subcontractor_id ?? null,
    hours: input.hours ?? null,
  };
}

function applyWorkerChange(
  row: SiteDiaryWorkerCountInput,
  change: SiteDiaryWorkerChange | undefined,
): SiteDiaryWorkerCountInput {
  if (!change) return row;
  return {
    ...row,
    count: change.count ?? row.count,
    hours: change.hours === undefined ? row.hours : change.hours,
  };
}

/**
 * `PATCH /diary/{id}` gövdesindeki `worker_counts[]`: kayıttaki bütün
 * satırlar (kendi ekip + firma) + eklenenler, eksi AÇIKÇA kaldırılanlar.
 */
export function buildSiteDiaryWorkerCountsSave(
  saved: readonly SiteDiaryWorkerCountRead[],
  plan: SiteDiaryWorkerCountsPlan = {},
): SiteDiaryWorkerCountInput[] {
  const removed = new Set(plan.removed ?? []);
  const changes = plan.changes ?? {};
  const rows = new Map<SiteDiaryWorkerKey, SiteDiaryWorkerCountInput>();

  for (const row of saved) {
    const key = siteDiaryWorkerKey(row);
    const base = normalizeWorker({
      trade: row.trade,
      source: row.source,
      count: row.count,
      subcontractor_id: row.subcontractor_id,
      hours: row.hours,
    });
    rows.set(key, applyWorkerChange(base, changes[key]));
  }
  for (const input of plan.added ?? []) {
    const key = siteDiaryWorkerKey(input);
    rows.set(key, applyWorkerChange(normalizeWorker(input), changes[key]));
  }

  return [...rows].filter(([key]) => !removed.has(key)).map(([, row]) => row);
}
