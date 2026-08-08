import { describe, it, expect } from "vitest";

import {
  buildDistributionSaveBody,
  distributionCellKey,
  distributionRejectionMessage,
} from "./contract-distribution-save";

// F-P5 T1 · POZ dağılımı kaydetme = BİRLEŞTİRME (hakediş/puantaj PUT'larının
// TERSİ). Aşağıdaki dört test bu dilimin EN KRİTİK semantiğinin kanıtıdır.

describe("buildDistributionSaveBody — BİRLEŞTİRME semantiği", () => {
  it("DOKUNULMAMIŞ hücre gövdeye GİRMEZ — sunucuda korunur", () => {
    // Izgarada üç hücre var; kullanıcı yalnız birine dokundu.
    const { body } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "120" },
    ]);

    expect(body.allocations).toEqual([
      { contract_item_id: "ci-1", site_id: "s-1", quantity: "120" },
    ]);
    // ci-1/s-2 ve ci-2/s-1 gövdede YOK ⇒ sunucu onlara dokunmaz.
    expect(body.allocations).toHaveLength(1);
  });

  it("BOŞALTILAN hücre `quantity: null` ile gider — bağ koparma", () => {
    const { body, rejections } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "   " },
    ]);

    expect(body.allocations).toEqual([
      { contract_item_id: "ci-1", site_id: "s-1", quantity: null },
    ]);
    expect(rejections).toEqual([]);
  });

  it("`0` ASLA gövdeye girmez — reddedilir (backend 422 verirdi)", () => {
    const { body, rejections } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "0" },
      { contractItemId: "ci-2", siteId: "s-1", value: "0,00" },
      { contractItemId: "ci-3", siteId: "s-1", value: "5" },
    ]);

    expect(body.allocations).toEqual([
      { contract_item_id: "ci-3", site_id: "s-1", quantity: "5" },
    ]);
    expect(rejections.map((r) => r.reason)).toEqual(["zero", "zero"]);
    // `0` SESSİZCE `null`a çevrilmez — kullanıcının niyeti değiştirilmez.
    expect(body.allocations.some((a) => a.quantity === null)).toBe(false);
  });

  it("yalnız KİRLİ hücreler gönderilir — karışık senaryo", () => {
    const { body } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "120.5" },
      { contractItemId: "ci-1", siteId: "s-2", value: "" },
      { contractItemId: "ci-2", siteId: "s-2", value: "8,25" },
    ]);

    expect(body.allocations).toEqual([
      { contract_item_id: "ci-1", site_id: "s-1", quantity: "120.5" },
      { contract_item_id: "ci-1", site_id: "s-2", quantity: null },
      { contract_item_id: "ci-2", site_id: "s-2", quantity: "8.25" },
    ]);
  });
});

describe("buildDistributionSaveBody — girdi ayrıştırma", () => {
  it("virgüllü ondalık noktaya çevrilir, basamaklar KAYIPSIZ korunur", () => {
    const { body } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "1250,400" },
    ]);
    expect(body.allocations[0].quantity).toBe("1250.400");
  });

  it("sayı olmayan ve negatif değerler reddedilir", () => {
    const { body, rejections } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "abc" },
      { contractItemId: "ci-2", siteId: "s-1", value: "-4" },
    ]);
    expect(body.allocations).toEqual([]);
    expect(rejections.map((r) => r.reason)).toEqual(["invalid", "invalid"]);
  });

  it("aynı hücre iki kez geçerse SON düzenleme kazanır (ret de temizlenir)", () => {
    const { body, rejections } = buildDistributionSaveBody([
      { contractItemId: "ci-1", siteId: "s-1", value: "0" },
      { contractItemId: "ci-1", siteId: "s-1", value: "42" },
    ]);
    expect(body.allocations).toEqual([
      { contract_item_id: "ci-1", site_id: "s-1", quantity: "42" },
    ]);
    expect(rejections).toEqual([]);
  });

  it("hiç kirli hücre yoksa gövde BOŞ dizi olur", () => {
    expect(buildDistributionSaveBody([]).body).toEqual({ allocations: [] });
  });
});

describe("yardımcılar", () => {
  it("distributionCellKey kalem+şantiyeyi tekilleştirir", () => {
    expect(distributionCellKey("ci-1", "s-1")).toBe("ci-1|s-1");
    expect(distributionCellKey("ci-1", "s-1")).not.toBe(distributionCellKey("ci-1", "s-2"));
  });

  it("ret metinleri Türkçe ve gerekçeye özgüdür", () => {
    expect(distributionRejectionMessage("zero")).toContain("0 olamaz");
    expect(distributionRejectionMessage("invalid")).toContain("geçerli bir sayı");
  });
});
