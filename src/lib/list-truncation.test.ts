import { describe, it, expect } from "vitest";

import { buildListTruncation, listTruncationMessage } from "./list-truncation";

// Final inceleme F-3 — sayfalama tavanının sessizce yutulmaması bu saf
// yardımcının doğruluğuna bağlıdır.
describe("buildListTruncation", () => {
  it("total gösterilenden büyükse kırpılmayı bildirir", () => {
    expect(buildListTruncation(200, 210)).toEqual({
      isTruncated: true,
      shownCount: 200,
      totalCount: 210,
    });
  });

  it("total gösterilene eşitse kırpılma YOK", () => {
    expect(buildListTruncation(12, 12).isTruncated).toBe(false);
  });

  it("total bilinmiyorsa (yükleniyor/hata) kırpılma İDDİA EDİLMEZ", () => {
    expect(buildListTruncation(0, undefined)).toEqual({
      isTruncated: false,
      shownCount: 0,
      totalCount: 0,
    });
  });

  it("total gösterilenden küçükse (tutarsız yanıt) kırpılma iddia edilmez", () => {
    expect(buildListTruncation(10, 3).isTruncated).toBe(false);
  });
});

describe("listTruncationMessage", () => {
  it("Türkçe sınır metnini gerçek sayılarla üretir", () => {
    expect(listTruncationMessage(buildListTruncation(200, 210))).toBe(
      "İlk 200 kayıt gösteriliyor (toplam 210) — liste eksik.",
    );
  });
});
