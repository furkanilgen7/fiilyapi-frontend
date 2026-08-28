import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { WORKER_SOURCE_LABELS, WORKER_SOURCE_VALUES } from "./timesheet-codes";
import { TimesheetTable } from "./TimesheetTable";
import type { TimesheetViewRow } from "./derive";

// F-TB1 T5 — ŞP "Tür" rozeti (source badge). Enum BEŞ değerlidir (`schema.d.ts`
// `WorkerSource`); mockup (ŞP 150/170) yalnız Şirket/Taşeron çizer ama tel
// üzerinden `general`/`freelance`/`intern` de gelebilir. Bu test enum'un
// TÜMÜNÜN etiketli basıldığını ve ham değerin HİÇBİR ZAMAN görünmediğini
// kilitler — `WORKER_SOURCE_VALUES` şemadan türediği için yeni bir enum
// değeri eklenirse bu test/typecheck (Record<WorkerSource, …>) kırılır.

function rowFor(source: (typeof WORKER_SOURCE_VALUES)[number]): TimesheetViewRow {
  return {
    personnelId: `per-${source}`,
    fullName: `Kişi ${source}`,
    trade: "Kalıpçı",
    source,
    subcontractorName: null,
    cells: {},
    totalHours: "0",
  };
}

describe("TimesheetTable — Tür rozeti", () => {
  it("worker_source enum'unun HER değeri Türkçe etiketle basılır", () => {
    const rows = WORKER_SOURCE_VALUES.map(rowFor);
    render(
      <TimesheetTable days={[]} rows={rows} totalHours="0" normalDayHours="9" />,
    );

    for (const source of WORKER_SOURCE_VALUES) {
      expect(screen.getAllByText(WORKER_SOURCE_LABELS[source]).length).toBeGreaterThan(0);
    }
  });

  it("ham enum değeri (freelance/intern/general) METİN olarak sızmaz", () => {
    const rows = WORKER_SOURCE_VALUES.map(rowFor);
    render(
      <TimesheetTable days={[]} rows={rows} totalHours="0" normalDayHours="9" />,
    );

    for (const raw of ["general", "freelance", "intern"] as const) {
      expect(screen.queryByText(raw)).toBeNull();
    }
  });

  it("Şirket/Taşeron DIŞINDAKİ kaynaklar nötr rozete düşer (mavi/amber uydurulmaz)", () => {
    const rows = WORKER_SOURCE_VALUES.map(rowFor);
    render(
      <TimesheetTable days={[]} rows={rows} totalHours="0" normalDayHours="9" />,
    );

    const companyBadge = screen.getByText(WORKER_SOURCE_LABELS.company);
    const subcontractorBadge = screen.getByText(WORKER_SOURCE_LABELS.subcontractor);
    const generalBadge = screen.getByText(WORKER_SOURCE_LABELS.general);
    const freelanceBadge = screen.getByText(WORKER_SOURCE_LABELS.freelance);
    const internBadge = screen.getByText(WORKER_SOURCE_LABELS.intern);

    expect(companyBadge.className).toContain("badge--primary");
    expect(subcontractorBadge.className).toContain("badge--warning");
    expect(generalBadge.className).toContain("badge--neutral");
    expect(freelanceBadge.className).toContain("badge--neutral");
    expect(internBadge.className).toContain("badge--neutral");
  });
});
