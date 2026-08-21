import { describe, expect, it } from "vitest";

import {
  FACING_OPTIONS as UNIT_FORM_FACING_OPTIONS,
  UNIT_KIND_OPTIONS as UNIT_FORM_KIND_OPTIONS,
  UNIT_LAYOUT_OPTIONS as UNIT_FORM_LAYOUT_OPTIONS,
} from "@/components/unit-form/constants";

import {
  BULK_MAX_UNITS,
  BULK_MAX_UNITS_MESSAGE,
  BULK_RANGE_INVALID_MESSAGE,
  BULK_UNIT_COST_HINT,
  BULK_UNIT_COST_LABEL,
  BULK_UNIT_COST_PENDING_REASON,
  BULK_UNITS_PER_FLOOR_MAX,
  BULK_UNITS_PER_FLOOR_MESSAGE,
  BULK_UNITS_PER_FLOOR_MIN,
  FACING_OPTIONS,
  NUMBERING_OPTIONS,
  UNIT_KIND_OPTIONS,
  UNIT_LAYOUT_OPTIONS,
} from "./constants";

describe("bulk-unit-form/constants — F-UNIT1 seçenekleri YENİDEN TANIMLANMAZ", () => {
  it("FACING_OPTIONS unit-form'un TAM AYNI nesnesidir (iki kopya zamanla ayrışır)", () => {
    expect(FACING_OPTIONS).toBe(UNIT_FORM_FACING_OPTIONS);
  });

  it("UNIT_KIND_OPTIONS unit-form'un TAM AYNI nesnesidir", () => {
    expect(UNIT_KIND_OPTIONS).toBe(UNIT_FORM_KIND_OPTIONS);
  });

  it("UNIT_LAYOUT_OPTIONS unit-form'un TAM AYNI nesnesidir", () => {
    expect(UNIT_LAYOUT_OPTIONS).toBe(UNIT_FORM_LAYOUT_OPTIONS);
  });
});

describe("NUMBERING_OPTIONS — TU 79 dört desen + korunan beşinci", () => {
  it("enum'un BEŞ üyesini de taşır (dördü mockup'tan, biri şema varsayılanı)", () => {
    expect(NUMBERING_OPTIONS.map((option) => option.value)).toEqual([
      "block_sequence",
      "floor_sequence",
      "label_sequence",
      "block_floor_sequence",
      "sequential",
    ]);
  });

  it("ilk dördünün etiketi TU 79'un jeton dilinden BİREBİRDİR", () => {
    expect(NUMBERING_OPTIONS[0].label).toBe("{Blok}-{Sıra} → C-1, C-2, C-3...");
    expect(NUMBERING_OPTIONS[1].label).toBe("{Kat}{Sıra} → 11, 12, 13, 21, 22...");
    expect(NUMBERING_OPTIONS[2].label).toBe("Daire {Sıra} → Daire 1, Daire 2...");
    expect(NUMBERING_OPTIONS[3].label).toBe("{Blok}{Kat}{Sıra} → C11, C12, C13...");
  });

  it("MOCKUP + BİR: beşinci üye şema VARSAYILANIDIR, mockup'ın dilinde etiketlenir", () => {
    expect(NUMBERING_OPTIONS[4]).toEqual({ value: "sequential", label: "{Sıra} → 1, 2, 3..." });
  });
});

describe("Sınırlar — sunucu metniyle BİREBİR", () => {
  it("kat aralığı ve 500 sınırı mesajları schemas.py'den kopyadır", () => {
    expect(BULK_RANGE_INVALID_MESSAGE).toBe("Bitiş katı başlangıç katından küçük olamaz");
    expect(BULK_MAX_UNITS_MESSAGE).toBe("Tek seferde en fazla 500 ünite üretilebilir");
  });

  it("sayısal sınırlar sunucunun Field kısıtlarıyla aynıdır", () => {
    expect(BULK_MAX_UNITS).toBe(500);
    expect(BULK_UNITS_PER_FLOOR_MIN).toBe(1);
    expect(BULK_UNITS_PER_FLOOR_MAX).toBe(20);
  });

  it("kat başına daire mesajı sınırları METİN olarak da taşır", () => {
    expect(BULK_UNITS_PER_FLOOR_MESSAGE).toContain("1");
    expect(BULK_UNITS_PER_FLOOR_MESSAGE).toContain("20");
  });
});

describe("TU 104 'Maliyet (₺)' — karar 3, sütun SİLİNMEZ", () => {
  it("etiket mockup'tan birebir, gerekçe GÖRÜNÜR bir cümledir", () => {
    expect(BULK_UNIT_COST_LABEL).toBe("Maliyet (₺)");
    expect(BULK_UNIT_COST_HINT.trim()).not.toBe("");
    expect(BULK_UNIT_COST_PENDING_REASON).toContain("maliyet");
  });
});
