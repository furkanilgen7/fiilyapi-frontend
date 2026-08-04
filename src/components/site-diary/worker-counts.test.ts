import { describe, it, expect } from "vitest";

import type { SiteDiaryWorkerCountRead } from "@/lib/api/hooks/useSiteDiary";

import {
  areWorkerCountsDirty,
  buildWorkerCountsBody,
  buildWorkerRows,
  DIARY_WORKER_PRESETS,
  invalidWorkerCountKeys,
  parseWorkerCount,
  workerCountKey,
  workerCountsFromEntry,
  workerCountsTotal,
} from "./worker-counts";

// F-SD T6 · T3'ün "Bugünkü İşçi Dağılımı" türevleri (GK414-439). Backend'in
// (trade, source) ikilisi ve DEĞİŞTİRME semantiği burada kanıtlanır.

function entryRow(overrides: Partial<SiteDiaryWorkerCountRead> = {}): SiteDiaryWorkerCountRead {
  return {
    id: "w-1",
    trade: "Kalıpçılar",
    source: "company",
    count: 12,
    ...overrides,
  } as SiteDiaryWorkerCountRead;
}

describe("buildWorkerRows", () => {
  it("mockup'ın dört ön tanımlı satırını aynı sırayla verir", () => {
    expect(buildWorkerRows([])).toEqual([...DIARY_WORKER_PRESETS]);
  });

  it("kayıtta olup ön tanımlılarda olmayan çifti SİLMEZ, sona ekler", () => {
    const rows = buildWorkerRows([entryRow({ trade: "Sıvacı", source: "subcontractor" })]);

    expect(rows).toHaveLength(DIARY_WORKER_PRESETS.length + 1);
    expect(rows.at(-1)).toEqual({ trade: "Sıvacı", source: "subcontractor" });
  });

  it("kayıttaki çift ön tanımlıyla aynıysa satır ÇİFTLENMEZ", () => {
    const rows = buildWorkerRows([entryRow({ trade: "Kalıpçılar", source: "company" })]);

    expect(rows).toHaveLength(DIARY_WORKER_PRESETS.length);
  });

  it("aynı meslek FARKLI kaynakta ayrı satırdır (kimlik ikilidir)", () => {
    const rows = buildWorkerRows([entryRow({ trade: "Kalıpçılar", source: "subcontractor" })]);

    expect(rows).toHaveLength(DIARY_WORKER_PRESETS.length + 1);
    expect(workerCountKey({ trade: "Kalıpçılar", source: "subcontractor" })).not.toBe(
      workerCountKey({ trade: "Kalıpçılar", source: "company" }),
    );
  });
});

describe("workerCountsFromEntry", () => {
  it("sıfır sayılı satırı BOŞ hücre olarak gösterir", () => {
    const values = workerCountsFromEntry([
      entryRow({ trade: "Kalıpçılar", source: "company", count: 0 }),
      entryRow({ id: "w-2", trade: "Demirciler", source: "subcontractor", count: 8 }),
    ]);

    expect(values["company|Kalıpçılar"]).toBe("");
    expect(values["subcontractor|Demirciler"]).toBe("8");
  });
});

describe("parseWorkerCount", () => {
  it("boş hücre sıfırdır", () => {
    expect(parseWorkerCount("")).toBe(0);
    expect(parseWorkerCount("   ")).toBe(0);
  });

  it("pozitif tam sayıyı çevirir", () => {
    expect(parseWorkerCount(" 12 ")).toBe(12);
  });

  it("negatif / ondalıklı / metin değeri null döner (sessizce 0 YAZILMAZ)", () => {
    expect(parseWorkerCount("-1")).toBeNull();
    expect(parseWorkerCount("2.5")).toBeNull();
    expect(parseWorkerCount("2,5")).toBeNull();
    expect(parseWorkerCount("abc")).toBeNull();
  });
});

describe("invalidWorkerCountKeys", () => {
  it("yalnız geçersiz hücrelerin anahtarlarını döner", () => {
    expect(
      invalidWorkerCountKeys({
        "company|Kalıpçılar": "12",
        "general|Yardımcı": "-3",
        "subcontractor|Demirciler": "",
      }),
    ).toEqual(["general|Yardımcı"]);
  });
});

describe("workerCountsTotal", () => {
  it("GK434 toplamı hücrelerden anında türetir", () => {
    const rows = buildWorkerRows([]);

    expect(
      workerCountsTotal(rows, {
        "company|Kalıpçılar": "12",
        "subcontractor|Demirciler": "8",
        "general|Yardımcı": "6",
      }),
    ).toBe(26);
  });

  it("hücrelerden biri geçersizse toplam BASILMAZ (null)", () => {
    const rows = buildWorkerRows([]);

    expect(workerCountsTotal(rows, { "company|Kalıpçılar": "x" })).toBeNull();
  });
});

describe("buildWorkerCountsBody", () => {
  it("sıfır satırı gövdeye KOYMAZ (DEĞİŞTİRME semantiği → backend'de silinir)", () => {
    const rows = buildWorkerRows([]);
    const body = buildWorkerCountsBody(rows, {
      "company|Kalıpçılar": "12",
      "subcontractor|Demirciler": "0",
      "general|Yardımcı": "",
    });

    expect(body).toEqual([{ trade: "Kalıpçılar", source: "company", count: 12 }]);
  });

  it("geçersiz hücre varsa gövde ÜRETİLMEZ (null) — yanlış sayı yazılmaz", () => {
    const rows = buildWorkerRows([]);

    expect(buildWorkerCountsBody(rows, { "company|Kalıpçılar": "-2" })).toBeNull();
  });

  it("kayıttan gelen fazladan çift de gövdeye girer (veri kaybı yok)", () => {
    const entryRows = [entryRow({ trade: "Sıvacı", source: "subcontractor", count: 5 })];
    const body = buildWorkerCountsBody(buildWorkerRows(entryRows), {
      "subcontractor|Sıvacı": "5",
    });

    expect(body).toEqual([{ trade: "Sıvacı", source: "subcontractor", count: 5 }]);
  });
});

describe("areWorkerCountsDirty", () => {
  const entryRows = [entryRow({ trade: "Kalıpçılar", source: "company", count: 12 })];

  it("kayıtla aynı değerlerde false döner", () => {
    expect(
      areWorkerCountsDirty(entryRows, buildWorkerRows(entryRows), { "company|Kalıpçılar": "12" }),
    ).toBe(false);
  });

  it("boş hücre ile '0' AYNI sayılır (kayıtta 0 → ekranda boş)", () => {
    const zeroRows = [entryRow({ trade: "Kalıpçılar", source: "company", count: 0 })];

    expect(
      areWorkerCountsDirty(zeroRows, buildWorkerRows(zeroRows), { "company|Kalıpçılar": "" }),
    ).toBe(false);
  });

  it("değer değişince true döner", () => {
    expect(
      areWorkerCountsDirty(entryRows, buildWorkerRows(entryRows), { "company|Kalıpçılar": "13" }),
    ).toBe(true);
  });

  it("kayıtta olan satır ekranda boşaltılırsa true döner", () => {
    expect(
      areWorkerCountsDirty(entryRows, buildWorkerRows(entryRows), { "company|Kalıpçılar": "" }),
    ).toBe(true);
  });
});
