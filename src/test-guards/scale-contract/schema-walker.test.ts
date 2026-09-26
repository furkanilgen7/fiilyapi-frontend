// @vitest-environment node
import { describe, it, expect } from "vitest";
import { walkResponse, type JsonSchemaNode, type OpenApiDocForWalk } from "./schema-walker";

const FAKE_DOC: OpenApiDocForWalk = {
  components: {
    schemas: {
      Leaf: {
        type: "object",
        properties: {
          progress_pct: { anyOf: [{ type: "number" }, { type: "null" }] },
          name: { type: "string" },
        },
      },
      Wrapper: {
        type: "object",
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Leaf" } },
          totals: { $ref: "#/components/schemas/Totals" },
          bag: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/Leaf" },
          },
        },
      },
      Totals: {
        type: "object",
        properties: {
          grand_progress_pct: { type: "number" },
        },
      },
      // KAYIT (2026-09-26): anyOf[$ref, null] dalı bir NESNE değerine
      // çözüldüğünde, dalın $ref'i ÇÖZÜLMEDEN önce `walkSchema`ya geri
      // verilmezse şema adı yanlışlıkla DIŞ bağlamın adında (burada
      // "Outer") kalıyordu — gerçek veride bu, `ProjectListItem.our_share_pct`
      // gibi yanlış bir anahtar üretti (olması gereken: `LandShareCard.our_share_pct`,
      // bkz. TEST-F2 raporu). `Inner`in kendi alanı ("share_pct") bu regresyonu
      // yakalar.
      Outer: {
        type: "object",
        properties: {
          inner: { anyOf: [{ $ref: "#/components/schemas/Inner" }, { type: "null" }] },
        },
      },
      Inner: {
        type: "object",
        properties: {
          share_pct: { type: "string" },
        },
      },
    },
  },
};

const WRAPPER_REF: JsonSchemaNode = { $ref: "#/components/schemas/Wrapper" };
const OUTER_REF: JsonSchemaNode = { $ref: "#/components/schemas/Outer" };

describe("schema-walker", () => {
  it("düz alanı doğrudan bulur", () => {
    const observed = walkResponse(
      { $ref: "#/components/schemas/Totals" },
      { grand_progress_pct: 0.42 },
      FAKE_DOC,
    );
    expect(observed.get("Totals.grand_progress_pct")).toEqual([0.42]);
  });

  it("array.items içindeki anyOf(number|null) dalını değere göre seçer", () => {
    const observed = walkResponse(
      WRAPPER_REF,
      { items: [{ progress_pct: 55, name: "a" }, { progress_pct: null, name: "b" }], totals: { grand_progress_pct: 1 }, bag: {} },
      FAKE_DOC,
    );
    expect(observed.get("Leaf.progress_pct")).toEqual([55, null]);
  });

  it("$ref zincirini (Wrapper.totals -> Totals) doğru şema adına atfeder", () => {
    const observed = walkResponse(
      WRAPPER_REF,
      { items: [], totals: { grand_progress_pct: 7 }, bag: {} },
      FAKE_DOC,
    );
    expect(observed.get("Totals.grand_progress_pct")).toEqual([7]);
    // Wrapper'ın kendi alan adı ölçek-şüpheli değil (`totals`, `items`, `bag`), bu yüzden
    // Wrapper.* anahtarı hiç oluşmamalı.
    expect([...observed.keys()].some((k) => k.startsWith("Wrapper."))).toBe(false);
  });

  it("additionalProperties (sözlük) altındaki iç içe şemayı yürür", () => {
    const observed = walkResponse(
      WRAPPER_REF,
      { items: [], totals: { grand_progress_pct: 1 }, bag: { x: { progress_pct: 33, name: "x" } } },
      FAKE_DOC,
    );
    expect(observed.get("Leaf.progress_pct")).toEqual([33]);
  });

  it("undefined alanı yoksayar (observed'e girmez)", () => {
    const observed = walkResponse({ $ref: "#/components/schemas/Totals" }, {}, FAKE_DOC);
    expect(observed.has("Totals.grand_progress_pct")).toBe(false);
  });

  it("REGRESYON: anyOf[$ref, null] dalı objeye çözülünce doğru şema adına atfeder (dış bağlama DEĞİL)", () => {
    const observed = walkResponse(OUTER_REF, { inner: { share_pct: "55" } }, FAKE_DOC);
    expect(observed.get("Inner.share_pct")).toEqual(["55"]);
    expect(observed.has("Outer.share_pct")).toBe(false);
  });
});
