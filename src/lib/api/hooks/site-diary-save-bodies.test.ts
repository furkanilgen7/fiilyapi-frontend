import { describe, it, expect } from "vitest";

import type { SiteDiaryLineRead, SiteDiaryWorkerCountRead } from "./useSiteDiary";
import {
  buildSiteDiaryLinesSave,
  buildSiteDiaryWorkerCountsSave,
  siteDiaryLineKey,
  siteDiaryWorkerKey,
} from "./site-diary-save-bodies";

// PLN-F2.1 · Günlük DEĞİŞTİRME gövdelerinin TAM KÜME bekçisi (plan §0).
//
// `PUT /diary/{id}/lines` ve `PATCH /diary/{id}` içindeki `worker_counts[]`
// gövdede geçmeyen satırı SİLER. Kısmi küme = sessiz veri kaybı: bölümlü
// satırlar, Bölümsüz iskelet ve firma (taşeron) satırları gövdeye HER ZAMAN
// girer — yalnız AÇIKÇA kaldırılan (`removed`) düşer. Yeni anahtarlar
// (`section_id`, `overrun_reason`, `subcontractor_id`, `hours`) değer `null`
// olsa da gövdede AÇIKÇA bulunur: backend B2.x-A bekçisi "hiçbir satır bu
// anahtarı taşımıyorsa eski istemci" der ve 409 döner.

const ITEM_A = "item-a";
const ITEM_B = "item-b";
const SEC_1 = "sec-1";
const SEC_2 = "sec-2";
const FIRM = "firm-9";

function line(overrides: Partial<SiteDiaryLineRead>): SiteDiaryLineRead {
  return {
    id: "l",
    boq_item_id: ITEM_A,
    section_id: null,
    code: "01.001",
    description: "Kalıp",
    unit: "m²",
    unit_price: "100.00",
    quantity: "0.000",
    cumulative_quantity: "0.000",
    line_amount: "0.00",
    overrun_reason: null,
    // DET-1.B: bölümsüz satırda bölüm adı `null` (bölümlü satırlar adı override eder).
    section_name: null,
    ...overrides,
  } satisfies SiteDiaryLineRead;
}

/** Üç satır türü: Bölümsüz iskelet · iki bölümlü (biri aşım gerekçeli). */
const SAVED_LINES: SiteDiaryLineRead[] = [
  line({ id: "l-1", boq_item_id: ITEM_A, section_id: null, quantity: "0.000" }),
  line({ id: "l-2", boq_item_id: ITEM_A, section_id: SEC_1, section_name: "Kat 1–5", quantity: "12.500" }),
  line({
    id: "l-3",
    boq_item_id: ITEM_B,
    section_id: SEC_2,
    section_name: "Kat 6–10",
    quantity: "40.000",
    overrun_reason: "Ek iş emri",
  }),
];

describe("siteDiaryLineKey", () => {
  it("kimlik (kalem, bölüm) ikilisidir — Bölümsüz ayrı anahtardır", () => {
    expect(siteDiaryLineKey(ITEM_A, null)).not.toBe(siteDiaryLineKey(ITEM_A, SEC_1));
    expect(siteDiaryLineKey(ITEM_A, undefined)).toBe(siteDiaryLineKey(ITEM_A, null));
  });
});

describe("buildSiteDiaryLinesSave — TAM küme", () => {
  it("değişiklik yokken kaydın BÜTÜN satırları (Bölümsüz + bölümlü) gövdeye girer", () => {
    expect(buildSiteDiaryLinesSave(SAVED_LINES)).toEqual({
      lines: [
        { boq_item_id: ITEM_A, section_id: null, quantity: "0.000", overrun_reason: null },
        { boq_item_id: ITEM_A, section_id: SEC_1, quantity: "12.500", overrun_reason: null },
        { boq_item_id: ITEM_B, section_id: SEC_2, quantity: "40.000", overrun_reason: "Ek iş emri" },
      ],
    });
  });

  it("tek satır değişince DİĞERLERİ düşmez (kısmi küme = veri kaybı)", () => {
    const body = buildSiteDiaryLinesSave(SAVED_LINES, {
      changes: { [siteDiaryLineKey(ITEM_A, null)]: { quantity: 3 } },
    });
    expect(body.lines).toHaveLength(3);
    expect(body.lines[0]).toEqual({ boq_item_id: ITEM_A, section_id: null, quantity: 3, overrun_reason: null });
    expect(body.lines[2]?.overrun_reason).toBe("Ek iş emri");
  });

  it("her satır `section_id` ve `overrun_reason` ANAHTARINI açıkça taşır (B2.x-A eski-istemci bekçisi)", () => {
    for (const row of buildSiteDiaryLinesSave(SAVED_LINES).lines) {
      expect(Object.keys(row)).toEqual(
        expect.arrayContaining(["boq_item_id", "section_id", "quantity", "overrun_reason"]),
      );
    }
    // JSON'a çevrilince de kaybolmaz (undefined olsaydı düşerdi).
    const json = JSON.parse(JSON.stringify(buildSiteDiaryLinesSave(SAVED_LINES))) as {
      lines: Record<string, unknown>[];
    };
    expect(json.lines[0]).toHaveProperty("section_id", null);
  });

  it("aşım gerekçesi değiştirilebilir ve null ile TEMİZLENEBİLİR", () => {
    const key = siteDiaryLineKey(ITEM_B, SEC_2);
    expect(
      buildSiteDiaryLinesSave(SAVED_LINES, { changes: { [key]: { overrunReason: null } } }).lines[2]
        ?.overrun_reason,
    ).toBeNull();
    expect(
      buildSiteDiaryLinesSave(SAVED_LINES, { changes: { [key]: { overrunReason: "Revize proje" } } })
        .lines[2]?.overrun_reason,
    ).toBe("Revize proje");
  });

  it("eklenen bölümlü satır sona girer; mevcut kümeden hiçbir şey düşmez", () => {
    const body = buildSiteDiaryLinesSave(SAVED_LINES, {
      added: [{ boq_item_id: ITEM_B, section_id: SEC_1, quantity: 5 }],
    });
    expect(body.lines).toHaveLength(4);
    expect(body.lines[3]).toEqual({ boq_item_id: ITEM_B, section_id: SEC_1, quantity: 5, overrun_reason: null });
  });

  it("kayıtta zaten olan anahtarla eklenen satır ÇİFTLENMEZ (backend 409 olurdu), yerini alır", () => {
    const body = buildSiteDiaryLinesSave(SAVED_LINES, {
      added: [{ boq_item_id: ITEM_A, section_id: SEC_1, quantity: 7 }],
    });
    expect(body.lines).toHaveLength(3);
    expect(body.lines[1]?.quantity).toBe(7);
  });

  it("YALNIZ açıkça kaldırılan satır düşer (G6)", () => {
    const body = buildSiteDiaryLinesSave(SAVED_LINES, { removed: [siteDiaryLineKey(ITEM_A, SEC_1)] });
    expect(body.lines.map((l) => [l.boq_item_id, l.section_id])).toEqual([
      [ITEM_A, null],
      [ITEM_B, SEC_2],
    ]);
  });

  it("bağı kopmuş satır (boq_item_id null) gövdeye GİREMEZ — şema zorunlu tutar", () => {
    const body = buildSiteDiaryLinesSave([...SAVED_LINES, line({ id: "l-x", boq_item_id: null })]);
    expect(body.lines).toHaveLength(3);
  });
});

function worker(overrides: Partial<SiteDiaryWorkerCountRead>): SiteDiaryWorkerCountRead {
  return {
    id: "w",
    trade: "Kalıpçılar",
    source: "company",
    count: 0,
    subcontractor_id: null,
    hours: null,
    // DET-1.B: firmasız satırda firma adı `null` (firma satırı adı override eder).
    subcontractor_name: null,
    ...overrides,
  } satisfies SiteDiaryWorkerCountRead;
}

/** İki satır türü: kendi ekip (meslek, kaynak) · firma satırı (kişi × saat). */
const SAVED_WORKERS: SiteDiaryWorkerCountRead[] = [
  worker({ id: "w-1", trade: "Kalıpçılar", source: "company", count: 12 }),
  worker({
    id: "w-2",
    trade: "Demirciler",
    source: "subcontractor",
    count: 8,
    subcontractor_id: FIRM,
    subcontractor_name: "Demir Taşeron",
    hours: "9.0",
  }),
];

describe("siteDiaryWorkerKey", () => {
  it("firma satırının kimliği FİRMADIR — aynı meslek/kaynaklı firmasız satırla çakışmaz", () => {
    const firm = siteDiaryWorkerKey({ trade: "Demirciler", source: "subcontractor", subcontractor_id: FIRM });
    const plain = siteDiaryWorkerKey({ trade: "Demirciler", source: "subcontractor" });
    expect(firm).not.toBe(plain);
    // Firmada meslek kimlik değildir (backend günceller).
    expect(siteDiaryWorkerKey({ trade: "Başka", source: "subcontractor", subcontractor_id: FIRM })).toBe(firm);
  });

  it("firmasız satırda eski (kaynak|meslek) biçimi korunur", () => {
    expect(siteDiaryWorkerKey({ trade: "Kalıpçılar", source: "company" })).toBe("company|Kalıpçılar");
  });
});

describe("buildSiteDiaryWorkerCountsSave — TAM küme", () => {
  it("değişiklik yokken kendi ekip + FİRMA satırları gövdeye girer (firma + saat korunur)", () => {
    expect(buildSiteDiaryWorkerCountsSave(SAVED_WORKERS)).toEqual([
      { trade: "Kalıpçılar", source: "company", count: 12, subcontractor_id: null, hours: null },
      { trade: "Demirciler", source: "subcontractor", count: 8, subcontractor_id: FIRM, hours: "9.0" },
    ]);
  });

  it("kendi ekip sayısı değişince firma satırı DÜŞMEZ", () => {
    const body = buildSiteDiaryWorkerCountsSave(SAVED_WORKERS, {
      changes: { "company|Kalıpçılar": { count: 14 } },
    });
    expect(body).toHaveLength(2);
    expect(body[0]?.count).toBe(14);
    expect(body[1]).toMatchObject({ subcontractor_id: FIRM, hours: "9.0", count: 8 });
  });

  it("her satır `subcontractor_id` ve `hours` ANAHTARINI açıkça taşır (B2.x-A bekçisi)", () => {
    const json = JSON.parse(JSON.stringify(buildSiteDiaryWorkerCountsSave(SAVED_WORKERS))) as Record<
      string,
      unknown
    >[];
    for (const row of json) {
      expect(row).toHaveProperty("subcontractor_id");
      expect(row).toHaveProperty("hours");
    }
  });

  it("firma satırının kişi × saati değiştirilebilir", () => {
    const key = siteDiaryWorkerKey({ trade: "Demirciler", source: "subcontractor", subcontractor_id: FIRM });
    const body = buildSiteDiaryWorkerCountsSave(SAVED_WORKERS, { changes: { [key]: { count: 10, hours: 8.5 } } });
    expect(body[1]).toEqual({
      trade: "Demirciler",
      source: "subcontractor",
      count: 10,
      subcontractor_id: FIRM,
      hours: 8.5,
    });
  });

  it("eklenen firma satırı sona girer; aynı firma ikinci kez eklenirse ÇİFTLENMEZ", () => {
    const added = buildSiteDiaryWorkerCountsSave(SAVED_WORKERS, {
      added: [{ trade: "Sıvacılar", source: "subcontractor", count: 4, subcontractor_id: "firm-2", hours: 9 }],
    });
    expect(added).toHaveLength(3);
    expect(added[2]).toMatchObject({ subcontractor_id: "firm-2", hours: 9 });

    const duplicate = buildSiteDiaryWorkerCountsSave(SAVED_WORKERS, {
      added: [{ trade: "Demirciler", source: "subcontractor", count: 6, subcontractor_id: FIRM }],
    });
    expect(duplicate).toHaveLength(2);
    expect(duplicate[1]).toMatchObject({ count: 6, subcontractor_id: FIRM, hours: null });
  });

  it("YALNIZ açıkça kaldırılan satır düşer", () => {
    const body = buildSiteDiaryWorkerCountsSave(SAVED_WORKERS, { removed: ["company|Kalıpçılar"] });
    expect(body).toEqual([
      { trade: "Demirciler", source: "subcontractor", count: 8, subcontractor_id: FIRM, hours: "9.0" },
    ]);
  });
});
