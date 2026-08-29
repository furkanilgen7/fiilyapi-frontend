import { describe, expect, test } from "vitest";

import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";

import { partitionSitePayments, projectWideNote } from "./site-payment-scope";

const SITE_ID = "site-1";

function payment(over: Partial<SiteSubcontractorPaymentItem> = {}): SiteSubcontractorPaymentItem {
  return {
    id: "scpp-1",
    contractId: "sc-1",
    subcontractorName: "Aydın Elektrik",
    sequenceNo: 1,
    periodYear: 2026,
    periodMonth: 7,
    workCategory: "Elektrik",
    sectionId: null,
    contractSiteId: SITE_ID,
    grossTotal: "1000.00",
    netTotal: "800.00",
    status: "approved",
    isRevisionRequired: false,
    ...over,
  };
}

describe("partitionSitePayments", () => {
  test("sözleşmesi şantiyeye bağlı satır siteScoped kümesine girer", () => {
    const result = partitionSitePayments([payment({ id: "santiyeli" })]);

    expect(result.siteScoped.map((i) => i.id)).toEqual(["santiyeli"]);
    expect(result.projectWide).toEqual([]);
  });

  test("🔴 HAK-NULL: proje geneli satır DÜŞÜRÜLMEZ, ayrı kümede taşınır", () => {
    const result = partitionSitePayments([payment({ id: "genel", contractSiteId: null })]);

    expect(result.projectWide.map((i) => i.id)).toEqual(["genel"]);
    // Kaybolmadığı AYRICA iddia edilir: eski kusurda satır hiçbir yerde yoktu.
    expect(result.siteScoped).toEqual([]);
  });

  test("🔴 POZİTİF KONTROL: proje geneli satır şantiye kümesine SIZMAZ", () => {
    // Bu iddia olmasaydı "her şeyi siteScoped'a koyan" bozuk bir ayırıcı da
    // yukarıdaki testleri geçerdi ve toplamlar sessizce N kez şişerdi.
    const result = partitionSitePayments([
      payment({ id: "santiyeli", grossTotal: "100.00" }),
      payment({ id: "genel", contractSiteId: null, grossTotal: "900.00" }),
    ]);

    expect(result.siteScoped.map((i) => i.id)).toEqual(["santiyeli"]);
    expect(result.siteScoped.map((i) => i.grossTotal)).toEqual(["100.00"]);
    expect(result.projectWide.map((i) => i.id)).toEqual(["genel"]);
  });

  test("iki eksen bağımsızdır: sectionId null olması kapsamı değiştirmez", () => {
    const result = partitionSitePayments([
      payment({ id: "bolumsuz-ama-santiyeli", sectionId: null, contractSiteId: SITE_ID }),
    ]);

    expect(result.siteScoped.map((i) => i.id)).toEqual(["bolumsuz-ama-santiyeli"]);
    expect(result.projectWide).toEqual([]);
  });

  test("giriş sırası korunur", () => {
    const result = partitionSitePayments([
      payment({ id: "a" }),
      payment({ id: "b" }),
      payment({ id: "c" }),
    ]);

    expect(result.siteScoped.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  test("boş liste iki boş küme verir", () => {
    expect(partitionSitePayments([])).toEqual({ siteScoped: [], projectWide: [] });
  });
});

describe("projectWideNote", () => {
  test("sıfırda not BASILMAZ", () => {
    expect(projectWideNote(0)).toBeNull();
  });

  test("not sayıyı ve TOPLAMA GİRMEDİĞİNİ söyler", () => {
    const note = projectWideNote(2);

    expect(note).toContain("2");
    // 🔴 Notun ASIL işi bu: kullanıcı listede gördüğü tutarın KPI'da neden
    // olmadığını başka türlü anlayamaz.
    expect(note).toContain("eklenmez");
  });
});
