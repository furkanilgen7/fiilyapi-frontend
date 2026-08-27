import { describe, it, expect } from "vitest";

import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";

import { partitionSectionPayments } from "./section-payments";

// F-BLMSEK T2 · Bölüm Detay › "Hakediş" sekmesinin SAF süzgeci.
//
// 🔴 K-IKIZ1 — POZİTİF KONTROL KARŞI KANIT TAŞIR. Fikstür ÜÇ hâli birden
// içerir (hedef bölüm · BAŞKA bölüm · `null`); yalnız hedef bölümün satırları
// verilseydi HİÇ SÜZMEYEN bir gövde de bu testlerden geçerdi. (Kanıt: canlı
// uçta uydurma bir UUID ile süzülen liste yine 23 satır döndü.)

const SECTION_ID = "sec-1";
const OTHER_SECTION_ID = "sec-2";

function payment(overrides: Partial<SiteSubcontractorPaymentItem> = {}): SiteSubcontractorPaymentItem {
  return {
    id: "pp-1",
    contractId: "c-1",
    subcontractorName: "Akın İnşaat",
    sequenceNo: 3,
    periodYear: 2026,
    periodMonth: 7,
    workCategory: "Betonarme İşleri",
    sectionId: SECTION_ID,
    grossTotal: "182400.00",
    netTotal: "160000.00",
    status: "approved",
    isRevisionRequired: false,
    ...overrides,
  } as SiteSubcontractorPaymentItem;
}

describe("partitionSectionPayments", () => {
  it("BU bölümün hakedişini BASILAN kümeye alır ve bölüm kapsamlı işaretler", () => {
    const result = partitionSectionPayments([payment({ id: "hedef" })], SECTION_ID);

    expect(result.entries.map((entry) => entry.item.id)).toEqual(["hedef"]);
    expect(result.entries[0].isSectionScoped).toBe(true);
    expect(result.sectionCount).toBe(1);
  });

  it("`sectionId === null` hakedişi BASILIR ('Tüm Bölümler' — kapsam iddiası bu bölümü DE kapsar)", () => {
    const result = partitionSectionPayments([payment({ id: "tumu", sectionId: null })], SECTION_ID);

    expect(result.entries.map((entry) => entry.item.id)).toEqual(["tumu"]);
    expect(result.entries[0].isSectionScoped).toBe(false);
    expect(result.allSectionsCount).toBe(1);
    expect(result.sectionCount).toBe(0);
  });

  it("BAŞKA bölümün hakedişi DÜŞÜRÜLÜR ama SAYILIR (sessiz atlama = ihlal)", () => {
    const result = partitionSectionPayments(
      [payment({ id: "baska", sectionId: OTHER_SECTION_ID })],
      SECTION_ID,
    );

    expect(result.entries).toEqual([]);
    expect(result.otherSectionCount).toBe(1);
  });

  it("🔴 K-IKIZ1 · üç hâl bir arada: hedef VE null BASILIR, başka bölüm BASILMAZ", () => {
    const result = partitionSectionPayments(
      [
        payment({ id: "hedef", sectionId: SECTION_ID }),
        payment({ id: "baska", sectionId: OTHER_SECTION_ID }),
        payment({ id: "tumu", sectionId: null }),
        payment({ id: "baska-2", sectionId: "sec-3" }),
      ],
      SECTION_ID,
    );

    expect(result.entries.map((entry) => entry.item.id)).toEqual(["hedef", "tumu"]);
    expect(result.entries.map((entry) => entry.isSectionScoped)).toEqual([true, false]);
    expect(result.sectionCount).toBe(1);
    expect(result.allSectionsCount).toBe(1);
    expect(result.otherSectionCount).toBe(2);
  });

  it("boş listede üç sayaç da sıfırdır", () => {
    const result = partitionSectionPayments([], SECTION_ID);

    expect(result.entries).toEqual([]);
    expect(result.sectionCount).toBe(0);
    expect(result.allSectionsCount).toBe(0);
    expect(result.otherSectionCount).toBe(0);
  });

  it("girdi listesini MUTASYONA UĞRATMAZ", () => {
    const items = [payment({ id: "hedef" }), payment({ id: "baska", sectionId: OTHER_SECTION_ID })];
    partitionSectionPayments(items, SECTION_ID);

    expect(items.map((item) => item.id)).toEqual(["hedef", "baska"]);
  });
});
