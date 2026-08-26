import { describe, expect, it } from "vitest";

import {
  allocationsTotal,
  checkOvershoot,
  mergeSectionAllocation,
} from "./allocation-merge";
import type { BoqItemAllocation } from "@/lib/api/hooks/useBoqAllocations";

const SEC_A = "aaaaaaaa-0000-4000-8000-000000000001";
const SEC_B = "bbbbbbbb-0000-4000-8000-000000000002";
const SEC_C = "cccccccc-0000-4000-8000-000000000003";

const alloc = (sectionId: string, quantity: string): BoqItemAllocation =>
  ({ section_id: sectionId, section_name: `bolum-${sectionId}`, quantity }) as BoqItemAllocation;

describe("mergeSectionAllocation — ÖBÜR BÖLÜMLERİN PAYLARI KORUNUR", () => {
  // 🔴 Bu dilimin en pahalı hatası: gövdeye yalnız kendi payını koymak.
  // İstek 200 döner, ekran doğru görünür, B ve C bölümlerinin payı SİLİNİR.
  it("bu bölümün payını değiştirirken öbür iki bölümü gövdede TUTAR", () => {
    const next = mergeSectionAllocation({
      current: [alloc(SEC_A, "480"), alloc(SEC_B, "300"), alloc(SEC_C, "120")],
      sectionId: SEC_A,
      nextQuantity: "500",
    });
    expect(next).toEqual([
      { section_id: SEC_B, quantity: "300" },
      { section_id: SEC_C, quantity: "120" },
      { section_id: SEC_A, quantity: "500" },
    ]);
  });

  it("bu bölüme İLK KEZ pay verilirken de öbürleri korunur", () => {
    const next = mergeSectionAllocation({
      current: [alloc(SEC_B, "300")],
      sectionId: SEC_A,
      nextQuantity: "50",
    });
    expect(next).toContainEqual({ section_id: SEC_B, quantity: "300" });
    expect(next).toContainEqual({ section_id: SEC_A, quantity: "50" });
  });

  // 🔴 `quantity` sözleşmede STRICT pozitiftir (gt=0). Sıfır göndermek 422.
  it.each(["0", "0.000", null] as const)(
    "miktar %s ise satır gövdeden DÜŞÜRÜLÜR (sıfır YAZILMAZ)",
    (nextQuantity) => {
      const next = mergeSectionAllocation({
        current: [alloc(SEC_A, "480"), alloc(SEC_B, "300")],
        sectionId: SEC_A,
        nextQuantity,
      });
      expect(next).toEqual([{ section_id: SEC_B, quantity: "300" }]);
      expect(next.some((a) => a.section_id === SEC_A)).toBe(false);
    },
  );

  // Karşıt kanıt: son payı da kaldırmak BOŞ dizi verir — "hepsini kaldır"
  // ANLAMLI bir gövdedir, alanı düşürmek DEĞİL.
  it("tek pay kaldırılınca boş dizi döner (alan düşürülmez)", () => {
    expect(
      mergeSectionAllocation({ current: [alloc(SEC_A, "10")], sectionId: SEC_A, nextQuantity: null }),
    ).toEqual([]);
  });

  it("girdi dizisini MUTASYONA UĞRATMAZ", () => {
    const current = [alloc(SEC_A, "480"), alloc(SEC_B, "300")];
    const snapshot = JSON.parse(JSON.stringify(current)) as unknown;
    mergeSectionAllocation({ current, sectionId: SEC_A, nextQuantity: "1" });
    expect(JSON.parse(JSON.stringify(current))).toEqual(snapshot);
  });
});

describe("allocationsTotal — ondalık toplama KAYIPSIZ", () => {
  it("float kalıntısı üretmez", () => {
    expect(
      allocationsTotal([
        { section_id: SEC_A, quantity: "0.1" },
        { section_id: SEC_B, quantity: "0.2" },
      ]),
    ).toBe("0.3");
  });

  it("boş küme sıfırdır", () => {
    expect(allocationsTotal([])).toBe("0");
  });
});

describe("checkOvershoot — kendi payı DAHİL edilir", () => {
  // 🔑 700 kotalı pozun 500'ü zaten BU bölümde. Ham `unallocated` 200'dür ama
  // bu bölüm 700'e kadar yazabilir; aksi hâlde kullanıcı kendi payını
  // büyütemez ve ekran sebepsiz kırmızı verirdi.
  it("kendi payını büyütmek aşım SAYILMAZ", () => {
    const result = checkOvershoot({
      siteQuota: "700",
      allocatedTotal: "500",
      sectionCurrentQuantity: "500",
      nextQuantity: "700",
    });
    expect(result.isOvershoot).toBe(false);
    expect(result.maxForSection).toBe("700");
  });

  it("öbür bölümlerin payı kadarını AŞAMAZ", () => {
    const result = checkOvershoot({
      siteQuota: "120",
      allocatedTotal: "76",
      sectionCurrentQuantity: "0",
      nextQuantity: "52",
    });
    // mockup üçüncü satırı: kota 120, dağıtılmış 76, kalan 44, girilen 52 → 8 aşım
    expect(result).toEqual({ isOvershoot: true, maxForSection: "44", excess: "8" });
  });

  it("tam sınırda aşım YOKTUR (sınır günü tuzağı: < değil <=)", () => {
    expect(
      checkOvershoot({
        siteQuota: "120",
        allocatedTotal: "76",
        sectionCurrentQuantity: "0",
        nextQuantity: "44",
      }),
    ).toEqual({ isOvershoot: false, maxForSection: "44", excess: "0" });
  });

  it("miktar girilmemişse aşım hesaplanmaz", () => {
    expect(
      checkOvershoot({
        siteQuota: "120",
        allocatedTotal: "76",
        sectionCurrentQuantity: "0",
        nextQuantity: null,
      }).isOvershoot,
    ).toBe(false);
  });
});
