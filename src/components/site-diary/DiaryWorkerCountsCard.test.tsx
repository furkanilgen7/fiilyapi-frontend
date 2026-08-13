import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { WorkerSource } from "@/lib/api/hooks/useSiteDiary";

import { WORKER_SOURCE_LABELS, WORKER_SOURCE_VALUES } from "./diary-labels";
import { DiaryWorkerCountsCard } from "./DiaryWorkerCountsCard";
import type { DiaryFormState } from "./form-state";
import type { DiaryWorkerRow } from "./worker-counts";

// F-TB1 T5 — GK414-439 kartı mockup'ın dört ön tanımlı (trade, source)
// çiftini basar ama `source` kaynağı BEŞ değerlidir (`WorkerSource` şeması,
// bkz. `schema.d.ts`). `freelance`/`intern` mockup'ta yoktur ama İK-3
// dalıyla kayıtta gelebilir (aynı satır listesi genişleme borcu) — kart
// TÜM beş değeri etiketli basmalı, ham enum değeri (`freelance`, `intern`,
// …) HİÇBİR ZAMAN kullanıcıya sızmamalı.

// Bileşen `form`dan yalnız `workerCounts`i okur (bkz. `DiaryWorkerCountsCard.tsx`);
// geri kalan alanlar testte önemsiz, bilerek `unknown` üzerinden daraltılır.
function buildForm(rows: readonly DiaryWorkerRow[]): DiaryFormState {
  const workerCounts: Record<string, string> = {};
  for (const row of rows) workerCounts[`${row.source}|${row.trade}`] = "1";
  return { workerCounts } as unknown as DiaryFormState;
}

describe("DiaryWorkerCountsCard — worker_source beş değer", () => {
  it("enum'un HER değeri için rozet etiketli basılır, ham değer sızmaz", () => {
    const rows: DiaryWorkerRow[] = WORKER_SOURCE_VALUES.map((source) => ({
      trade: `Meslek-${source}`,
      source,
    }));

    render(
      <DiaryWorkerCountsCard
        rows={rows}
        form={buildForm(rows)}
        onChange={() => {}}
        disabled={false}
        isEntryMissing={false}
      />,
    );

    // Beklenen Türkçe etiketlerin HEPSİ görünür.
    for (const source of WORKER_SOURCE_VALUES) {
      expect(screen.getAllByText(WORKER_SOURCE_LABELS[source]).length).toBeGreaterThan(0);
    }

    // Ham enum değeri (İngilizce kod) hiçbir yerde METİN olarak basılmaz.
    const rawLeakCandidates: WorkerSource[] = ["freelance", "intern", "general", "subcontractor"];
    for (const raw of rawLeakCandidates) {
      // "company" hariç: hiçbiri Türkçe etiketle aynı değildir, o yüzden
      // ham değerin ekranda METİN olarak GEÇMEDİĞİNİ ayrıca doğrularız.
      expect(screen.queryByText(raw)).toBeNull();
    }
  });
});
