import { describe, expect, it } from "vitest";

import * as constants from "./constants";
import {
  BLOCK_BULK_UNITS_LABEL,
  BLOCK_CODE_MAX_LENGTH,
  BLOCK_NAME_MAX_LENGTH,
  BLOCK_NOTES_MAX_LENGTH,
  BLOCK_STATUS_OPTIONS,
  GROUND_FLOOR_USAGE_OPTIONS,
  PARKING_TYPE_OPTIONS,
  ROOF_TYPE_OPTIONS,
} from "./constants";

describe("BE seçici listeleri — sunucu enum'larıyla TAM örtüşür", () => {
  it("BE 80 Çatı Katı: none · duplex · terrace", () => {
    expect(ROOF_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "none",
      "duplex",
      "terrace",
    ]);
    expect(ROOF_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      "Yok",
      "Var (Dubleks)",
      "Var (Teras)",
    ]);
  });

  it("BE 82 Zemin Kat Kullanımı: commercial · apartment · common", () => {
    expect(GROUND_FLOOR_USAGE_OPTIONS.map((option) => option.value)).toEqual([
      "commercial",
      "apartment",
      "common",
    ]);
    expect(GROUND_FLOOR_USAGE_OPTIONS.map((option) => option.label)).toEqual([
      "Dükkan / Ticari",
      "Daire",
      "Ortak Alan",
    ]);
  });

  it("BE 86 Otopark: closed · open · none", () => {
    expect(PARKING_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "closed",
      "open",
      "none",
    ]);
    expect(PARKING_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      "Kapalı Otopark",
      "Açık Otopark",
      "Yok",
    ]);
  });

  it("BE 101 Durum: planning · construction · completed", () => {
    expect(BLOCK_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      "planning",
      "construction",
      "completed",
    ]);
    expect(BLOCK_STATUS_OPTIONS.map((option) => option.label)).toEqual([
      "Planlama",
      "İnşaat Halinde",
      "Tamamlandı",
    ]);
  });
});

describe("BE uzunluk sınırları — sunucu sözleşmesiyle aynı", () => {
  it("ad 50 · kod 20 · not 500", () => {
    expect(BLOCK_NAME_MAX_LENGTH).toBe(50);
    expect(BLOCK_CODE_MAX_LENGTH).toBe(20);
    expect(BLOCK_NOTES_MAX_LENGTH).toBe(500);
  });
});

describe("🔴 BE 109 kutucuğu ARTIK GERÇEK (F-UNIT2 T2c)", () => {
  it("etiket mockup'tan BİREBİRDİR ve 'henüz açılmadı' gerekçesi KALDIRILDI", () => {
    // Hedef ekran (`/satis/toplu-uretim`) canlıya geçtiği için pending cümlesi
    // YALAN olurdu; sabit metin silindi ve kutucuk etkinleştirildi.
    expect(BLOCK_BULK_UNITS_LABEL).toBe("Kaydettikten sonra toplu ünite üretimine geç");
    expect(constants).not.toHaveProperty("BLOCK_BULK_UNITS_PENDING_REASON");
  });
});
