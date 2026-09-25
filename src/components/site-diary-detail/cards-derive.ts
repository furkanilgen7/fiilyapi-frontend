import { WORKER_SOURCE_LABELS } from "@/components/site-diary/diary-labels";
import { buildWorkerRows, isFirmRow, LEGACY_WORKER_LABEL } from "@/components/site-diary/worker-counts";
import type { SiteDiaryEntryDetail, WorkerSource } from "@/lib/api/hooks/useSiteDiary";
import { multiplyDecimalStrings, sumDecimalStrings } from "@/lib/decimal";
import { maskeli } from "@/lib/masked";

/**
 * DET-1.3 · Detay kartlarının SAF türevleri (işçi dağılımı · S10 gizleme).
 *
 * İşçi satırlarının KÜMESİ ve SIRASI günlük ekranıyla AYNI mantıktan gelir
 * (`worker-counts.ts` · G12a): kendi ekip puantajdan (`own_crew_from_timesheet`),
 * sonra firma satırları, sonra sayısı > 0 eski firmasız satırlar ("Diğer
 * (eski kayıt)"). Düzenleme bileşenleri KULLANILMAZ — burada yalnız düz metin.
 */
export interface DetailWorkerRow {
  key: string;
  source: WorkerSource;
  sourceLabel: string;
  name: string;
  count: number;
  /** Kişi başı saat (kendi ekipte toplam puantaj saati); yoksa `null`. */
  hours: string | null;
  /** a-s: kendi ekipte saat, firmada kişi × saat; hesaplanamazsa `null`. */
  manHours: string | null;
  isSubcontractor: boolean;
}

export interface DetailWorkerSummary {
  rows: DetailWorkerRow[];
  totalPeople: number;
  /** Bilinen a-s'lerin toplamı. */
  totalManHours: string;
  /** KPI "25 kendi · 12 taşeron". */
  ownPeople: number;
  subcontractorPeople: number;
  /** "Taşeron: kişi × saat = a-s" notu yalnız firma satırı varken. */
  hasFirmRows: boolean;
}

type WorkerEntry = Pick<SiteDiaryEntryDetail, "worker_counts" | "own_crew_from_timesheet">;

export function detailWorkerSummary(entry: WorkerEntry): DetailWorkerSummary {
  const own: DetailWorkerRow[] = (entry.own_crew_from_timesheet ?? []).map((crew) => ({
    key: `own|${crew.source}|${crew.trade}`,
    source: crew.source,
    sourceLabel: WORKER_SOURCE_LABELS[crew.source],
    name: crew.trade,
    count: crew.headcount,
    hours: crew.hours,
    manHours: crew.hours,
    isSubcontractor: crew.source === "subcontractor",
  }));
  const byFirm = new Map(entry.worker_counts.map((row) => [row.subcontractor_id ?? "", row]));
  const dailyRows = buildWorkerRows(entry.worker_counts);
  const daily: DetailWorkerRow[] = dailyRows.map((row) => {
    const read = isFirmRow(row)
      ? byFirm.get(row.subcontractorId ?? "")
      : entry.worker_counts.find((item) => !item.subcontractor_id && item.trade === row.trade && item.source === row.source);
    const count = read?.count ?? 0;
    const hours = isFirmRow(row) ? (read?.hours ?? null) : null;
    return {
      key: `${row.source}|${row.subcontractorId ?? row.trade}`,
      source: row.source,
      sourceLabel: WORKER_SOURCE_LABELS[row.source],
      name: isFirmRow(row) ? (read?.subcontractor_name ?? row.trade) : `${LEGACY_WORKER_LABEL} · ${row.trade}`,
      count,
      hours,
      manHours: hours === null ? null : multiplyDecimalStrings(String(count), hours),
      isSubcontractor: row.source === "subcontractor",
    };
  });
  const rows = [...own, ...daily];
  const sum = (list: readonly DetailWorkerRow[]) => list.reduce((total, row) => total + row.count, 0);
  const subcontractorPeople = sum(rows.filter((row) => row.isSubcontractor));
  const totalPeople = sum(rows);
  return {
    rows,
    totalPeople,
    totalManHours: sumDecimalStrings(rows.flatMap((row) => (row.manHours === null ? [] : [row.manHours]))),
    ownPeople: totalPeople - subcontractorPeople,
    subcontractorPeople,
    hasFirmRows: dailyRows.some(isFirmRow),
  };
}

/**
 * S10 · Hakediş ₺ kolonu, ara toplam tutarı, katkı satırı ve KPI'sı GİZLENİR mi?
 *
 * KULLANICI KARARI (2026-09-25): "izin işleri en son düzenlenecek" → gizleme
 * İZNE bağlı DEĞİL; detay ₺'yi bugünkü günlük kayıt ekranıyla aynı şekilde
 * herkese gösterir. Yalnız tutar backend'den maskeli (`null`) gelirse gizli —
 * sıfır SAYILMAZ (`maskeli()`). İzin/alan maskesi işi kuyrukta.
 */
export function isPaymentHidden(input: { linesTotal: string | null | undefined }): boolean {
  return maskeli(input.linesTotal);
}
