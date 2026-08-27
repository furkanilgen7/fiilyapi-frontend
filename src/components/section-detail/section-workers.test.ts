import { describe, it, expect } from "vitest";

import type { TimesheetViewRow } from "@/components/timesheet/derive";

import {
  groupSectionWorkers,
  SECTION_WORKER_SEPARATOR,
  UNKNOWN_TRADE_LABEL,
} from "./section-workers";

/**
 * F-BLMPUAN — "Bu Bölümdeki İşçiler" kartının GRUPLAMA katmanı (D215-250).
 *
 * Gruplama bir SUNUM kararıdır: backend `TimesheetMatrixRow` başına
 * `trade` · `source` · `subcontractor_name` verir, satırları YAPIŞTIRMAZ.
 * Mockup DÖRT satır çizer ve her satır bir (kaynak, meslek, taşeron) üçlüsüdür.
 */

let seq = 0;
function row(over: Partial<TimesheetViewRow> = {}): TimesheetViewRow {
  seq += 1;
  return {
    personnelId: `p-${seq}`,
    fullName: `Kisi ${seq}`,
    trade: null,
    source: "company",
    subcontractorName: null,
    cells: { "2026-08-03": { code: "worked", overtimeHours: null, sectionId: "sec-1" } },
    manDays: 1,
    ...over,
  };
}

describe("groupSectionWorkers - mockup D215-250", () => {
  it("mockup'in DORT satirini uretir: rozet + etiket + kisi sayisi", () => {
    const rows: TimesheetViewRow[] = [
      ...Array.from({ length: 14 }, () => row({ trade: "Kalıpçı", source: "company" })),
      ...Array.from({ length: 18 }, () =>
        row({ trade: "Demirci", source: "subcontractor", subcontractorName: "Akın İnşaat" }),
      ),
      ...Array.from({ length: 8 }, () =>
        row({ trade: "Elektrikçi", source: "subcontractor", subcontractorName: "Yılmaz Elk." }),
      ),
      ...Array.from({ length: 8 }, () => row({ trade: "Amele", source: "general" })),
    ];

    expect(groupSectionWorkers(rows).map((g) => [g.source, g.label, g.count])).toEqual([
      ["company", "Kalıpçı", 14],
      ["subcontractor", `Demirci${SECTION_WORKER_SEPARATOR}Akın İnşaat`, 18],
      ["subcontractor", `Elektrikçi${SECTION_WORKER_SEPARATOR}Yılmaz Elk.`, 8],
      ["general", "Amele", 8],
    ]);
  });

  it("ayirac mockup'tan BIREBIR: bosluk + em dash + bosluk (D231)", () => {
    expect(SECTION_WORKER_SEPARATOR).toBe(" — ");
  });

  it("hucresi olmayan satir SAYILMAZ (kartoteks sizintisi)", () => {
    const rows = [row({ trade: "Kalıpçı" }), row({ trade: "Kalıpçı", cells: {}, manDays: 0 })];
    const groups = groupSectionWorkers(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(1);
  });

  it("bos girdi bos dizi verir (uydurma satir yok)", () => {
    expect(groupSectionWorkers([])).toEqual([]);
  });

  it("ayni meslek farkli taseronda AYRI grup", () => {
    const rows = [
      row({ trade: "Demirci", source: "subcontractor", subcontractorName: "Akın İnşaat" }),
      row({ trade: "Demirci", source: "subcontractor", subcontractorName: "Yılmaz Elk." }),
    ];
    expect(groupSectionWorkers(rows)).toHaveLength(2);
  });

  it("ayni meslek farkli kaynakta AYRI grup (rozet yalan soylemesin)", () => {
    const rows = [
      row({ trade: "Kalıpçı", source: "company" }),
      row({ trade: "Kalıpçı", source: "general" }),
    ];
    expect(groupSectionWorkers(rows).map((g) => g.source)).toEqual(["company", "general"]);
  });

  it("meslegi bos satir DURUST yer tutucu basar, taseron adi UYDURULMAZ", () => {
    expect(groupSectionWorkers([row({ trade: null })])[0].label).toBe(UNKNOWN_TRADE_LABEL);
  });

  it("meslek yok ama taseron varsa YALNIZ firma adi basilir (bos ayirac yazilmaz)", () => {
    const groups = groupSectionWorkers([
      row({ trade: null, source: "subcontractor", subcontractorName: "Akın İnşaat" }),
    ]);
    expect(groups[0].label).toBe("Akın İnşaat");
  });

  it("taseron adi null ise YALNIZ meslek basilir", () => {
    const groups = groupSectionWorkers([
      row({ trade: "Demirci", source: "subcontractor", subcontractorName: null }),
    ]);
    expect(groups[0].label).toBe("Demirci");
  });

  it("kaynak sirasi kisi sayisindan ONCE gelir", () => {
    const rows = [
      ...Array.from({ length: 9 }, () => row({ trade: "Amele", source: "general" })),
      row({ trade: "Kalıpçı", source: "company" }),
    ];
    expect(groupSectionWorkers(rows).map((g) => g.source)).toEqual(["company", "general"]);
  });

  // 🔴 AYRISMA NOKTASI: kisi-sayisi sirasi ile ETIKET sirasi ZIT secildi.
  // "Demirci"/"Elektrikci" ile yazilsaydi alfabetik sira ayni sonucu verir ve
  // bu bekci ESDEGER MUTANT uretirdi (bu turda fiilen olctuk).
  it("ayni kaynakta KISI SAYISI AZALAN siralanir (D226 18 > D233 8)", () => {
    const rows = [
      row({ trade: "Alcici", source: "subcontractor", subcontractorName: "Akın İnşaat" }),
      ...Array.from({ length: 3 }, () =>
        row({ trade: "Zimparaci", source: "subcontractor", subcontractorName: "Zorlu Ltd." }),
      ),
    ];
    expect(groupSectionWorkers(rows).map((g) => [g.label, g.count])).toEqual([
      ["Zimparaci — Zorlu Ltd.", 3],
      ["Alcici — Akın İnşaat", 1],
    ]);
  });

  // Ayirac ICEREN ad iki farkli ucluyu AYNI anahtara dusurmemeli.
  it("etiketi ayirac iceren iki AYRI uclu birlesmez", () => {
    const rows = [
      row({ trade: "A — B", source: "company", subcontractorName: null }),
      row({ trade: "A", source: "company", subcontractorName: "B" }),
    ];
    expect(groupSectionWorkers(rows)).toHaveLength(2);
  });

  it("esit sayida iki grup etikete gore (tr) siralanir", () => {
    const rows = [
      row({ trade: "Çilingir", source: "company" }),
      row({ trade: "Boyacı", source: "company" }),
    ];
    expect(groupSectionWorkers(rows).map((g) => g.label)).toEqual(["Boyacı", "Çilingir"]);
  });

  it("mockup'ta cizilmeyen freelance/intern DUSURULMEZ, kaynak sirasinda gelir", () => {
    const rows = [
      row({ trade: "Stajyer Is", source: "intern" }),
      row({ trade: "Serbest Is", source: "freelance" }),
      row({ trade: "Kalıpçı", source: "company" }),
    ];
    expect(groupSectionWorkers(rows).map((g) => g.source)).toEqual([
      "company",
      "freelance",
      "intern",
    ]);
  });

  it("toplam kisi = gruplarin kisi sayilarinin toplami", () => {
    const rows = [
      row({ trade: "Kalıpçı", source: "company" }),
      row({ trade: "Demirci", source: "subcontractor", subcontractorName: "Akın İnşaat" }),
      row({ trade: "Demirci", source: "subcontractor", subcontractorName: "Akın İnşaat" }),
    ];
    expect(groupSectionWorkers(rows).reduce((sum, g) => sum + g.count, 0)).toBe(3);
  });
});
