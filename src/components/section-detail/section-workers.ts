import { WORKER_SOURCE_VALUES } from "@/components/site-diary/diary-labels";
import type { TimesheetViewRow } from "@/components/timesheet/derive";
import type { WorkerSource } from "@/lib/api/hooks/usePersonnel";

/**
 * F-BLMPUAN — "Bu Bölümdeki İşçiler" kartının GRUPLAMA katmanı
 * (mockup `Bölüm Detay.dc.html` D215-250). Saf, bileşensiz, test edilebilir.
 *
 * 🔑 GRUPLAMA BİR SUNUM KARARIDIR: backend `TimesheetMatrixRow` başına
 * `trade` · `source` · `subcontractor_name` verir, satırları YAPIŞTIRMAZ.
 * Mockup DÖRT satır çizer (D219-246) ve her satır bir (kaynak, meslek,
 * taşeron) ÜÇLÜSÜDÜR — üçlünün herhangi bir bileşeni farklıysa satır AYRIDIR:
 *   • `source` farklıysa ROZET farklıdır (D219 "Şirket" · D226 "Taşeron");
 *     birleştirmek rozeti YALANCI yapar.
 *   • `subcontractor_name` farklıysa mockup zaten AYRI satır çizer
 *     (D226 "Demirciler — Akın İnşaat" ≠ D233 "Elektrikçiler — Yılmaz Elk.").
 *
 * 🔴 GİRDİ KÜMESİ: `useTimesheetData`nın BÖLÜM SÜZGEÇLİ satırları. O satırlar
 * K1 gereği AKTİF PERSONEL KARTOTEKSİNDEN kurulur — yani bu bölümde hiç
 * çalışmamış personel de satır alır (hücresiz). Kart YALNIZ hücresi olan
 * satırları sayar; aksi hâlde "bu bölümdeki işçiler" şirketin TÜM personelini
 * sayardı. Aynı ölçüt `derive.ts/workerCount` ile BİREBİRDİR.
 */

/** D231 ayıracı — boşluk + em dash + boşluk. Mockup'tan BİREBİR. */
export const SECTION_WORKER_SEPARATOR = " — ";

/**
 * Mesleği de taşeron adı da olmayan grubun etiketi. Uydurma meslek adı
 * YAZILMAZ; repo kanonu gereği dürüst yer tutucu basılır.
 */
export const UNKNOWN_TRADE_LABEL = "—";

export interface SectionWorkerGroup {
  /**
   * React anahtarı — üçlünün kendisi. `JSON.stringify` KULLANILIR: düz bir
   * ayıraçla birleştirmek, ayıracı İÇEREN bir meslek/firma adında iki farklı
   * üçlüyü aynı anahtara düşürürdü.
   */
  readonly key: string;
  /** Rozetin kaynağı; etiket/renk `timesheet-codes` çözümleyicilerinden gelir. */
  readonly source: WorkerSource;
  /** D220/D228 — "Kalıpçı" ya da "Demirci — Akın İnşaat". */
  readonly label: string;
  /** D224 — "14 kişi"; bu üçlüdeki AYRIK personel sayısı. */
  readonly count: number;
}

/**
 * Kaynak sırası mockup'ın satır sırasıdır (D219 Şirket → D226/D233 Taşeron →
 * D240 Genel) ve `WORKER_SOURCE_VALUES`ün sırasıyla ÇAKIŞIR — ikinci bir sıra
 * sabiti UYDURULMAZ. Mockup'ta çizilmeyen `freelance`/`intern` DÜŞÜRÜLMEZ
 * (kayıt gizlemek veri kaybıdır), aynı listenin sonunda gelir.
 */
function sourceRank(source: WorkerSource): number {
  const index = WORKER_SOURCE_VALUES.indexOf(source);
  return index === -1 ? WORKER_SOURCE_VALUES.length : index;
}

/** D220/D228 — "meslek — firma"; eksik parça AYIRAÇ BIRAKMAZ. */
function groupLabel(trade: string | null, subcontractorName: string | null): string {
  const parts = [trade, subcontractorName].filter(
    (part): part is string => part !== null && part.trim().length > 0,
  );
  return parts.length === 0 ? UNKNOWN_TRADE_LABEL : parts.join(SECTION_WORKER_SEPARATOR);
}

export function groupSectionWorkers(
  rows: readonly TimesheetViewRow[],
): readonly SectionWorkerGroup[] {
  const byKey = new Map<string, { group: SectionWorkerGroup; personnel: Set<string> }>();

  for (const row of rows) {
    // Hücresi olmayan satır bu bölümde ÇALIŞMAMIŞTIR (kartoteks satırı).
    if (Object.keys(row.cells).length === 0) continue;

    const key = JSON.stringify([row.source, row.trade, row.subcontractorName]);
    const existing = byKey.get(key);
    if (existing) {
      existing.personnel.add(row.personnelId);
      continue;
    }
    byKey.set(key, {
      group: {
        key,
        source: row.source,
        label: groupLabel(row.trade, row.subcontractorName),
        count: 0,
      },
      personnel: new Set([row.personnelId]),
    });
  }

  return [...byKey.values()]
    .map(({ group, personnel }) => ({ ...group, count: personnel.size }))
    .sort((a, b) => {
      const rank = sourceRank(a.source) - sourceRank(b.source);
      if (rank !== 0) return rank;
      if (a.count !== b.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "tr");
    });
}
