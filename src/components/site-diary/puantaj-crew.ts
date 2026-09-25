import type { TimesheetWeekRow } from "@/lib/api/hooks/useTimesheet";
import type { WorkerSource } from "@/lib/api/hooks/useSiteDiary";
import { sumDecimalStrings, isZeroDecimalString } from "@/lib/decimal";

/**
 * PLN-F2.2 · "Bugünkü İşçi Dağılımı"nın KENDİ EKİP saati — puantajdan SALT
 * OKUNUR (spec §2: formen puantaja işçi × gün × saat girer; İ:347 "kendi ekip
 * saati puantajdan gelir"). Çekirdek → çekirdek okuma (puantaj haftası),
 * planlama import YOK.
 *
 * Eşleme (meslek, kaynak) ikilisiyle yapılır. Günlüğün ön tanımlı satırları
 * çoğul ("Kalıpçılar"), puantaj mesleği tekildir ("Kalıpçı") — bu yüzden
 * meslek TR küçük harfe indirilip sondaki çoğul eki (-lar/-ler) atılarak
 * karşılaştırılır. Eşleşmeyen satır "—" basar (uydurma saat yok).
 */
export interface PuantajCrewCell {
  people: number;
  hours: string;
}

export interface PuantajDayCrew {
  byKey: ReadonlyMap<string, PuantajCrewCell>;
  totalPeople: number;
  totalHours: string;
}

/** Meslek eşleme anahtarı: TR küçük harf, boşluk kırpılmış, çoğul eki atılmış. */
export function normalizeTrade(trade: string): string {
  const lowered = trade.trim().toLocaleLowerCase("tr");
  return lowered.replace(/(lar|ler)$/u, "");
}

function crewKey(source: WorkerSource | string, trade: string): string {
  return `${source}|${normalizeTrade(trade)}`;
}

/** Puantaj haftasının `day` gününde saati olan kişiler — (kaynak, meslek) kırılımıyla. */
export function puantajDayCrew(rows: readonly TimesheetWeekRow[], day: string): PuantajDayCrew {
  const buckets = new Map<string, { people: number; hours: string[] }>();
  const all: string[] = [];
  for (const row of rows) {
    const cell = row.cells.find((item) => item.work_date === day);
    const hours = cell?.hours ?? null;
    if (hours === null || isZeroDecimalString(hours)) continue;
    const key = crewKey(row.source, row.trade ?? "");
    const bucket = buckets.get(key) ?? { people: 0, hours: [] };
    buckets.set(key, { people: bucket.people + 1, hours: [...bucket.hours, hours] });
    all.push(hours);
  }
  const byKey = new Map(
    [...buckets].map(([key, bucket]) => [key, { people: bucket.people, hours: sumDecimalStrings(bucket.hours) }]),
  );
  return { byKey, totalPeople: all.length, totalHours: sumDecimalStrings(all) };
}

/** Günlük satırının puantaj karşılığı; eşleşme yoksa `null`. */
export function puantajCellFor(
  crew: PuantajDayCrew,
  row: { trade: string; source: WorkerSource },
): PuantajCrewCell | null {
  return crew.byKey.get(crewKey(row.source, row.trade)) ?? null;
}
