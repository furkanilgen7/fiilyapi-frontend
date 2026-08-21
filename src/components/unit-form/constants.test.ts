import { describe, expect, it } from "vitest";

import {
  FACING_OPTIONS,
  OWNER_SIDE_OPTIONS,
  PARKING_RIGHT_OPTIONS,
  SALES_STATUS_OPTIONS,
  UNIT_COST_PENDING_REASON,
  UNIT_DOCUMENTS,
  UNIT_EXPECTED_PROFIT_PENDING_REASON,
  UNIT_KIND_OPTIONS,
  UNIT_LAYOUT_OPTIONS,
  UNIT_NO_MAX_LENGTH,
  VAT_RATE_OPTIONS,
} from "./constants";

describe("UE 78 Cephe / Yön — enum'un BEŞ değeri de ULAŞILABİLİR olmalı", () => {
  it("mockup dört seçenek çizse de liste BEŞ değerlidir (Batı dahil)", () => {
    // 🔴 `UnitFacing` = south · southwest · east · north · west. Dördünü
    // basmak `west`i UI'dan ULAŞILMAZ kılar: içe aktarmayla `west` yazılmış
    // bir ünite ekranda düzeltilemez hale gelir.
    expect(FACING_OPTIONS.map((option) => option.value)).toEqual([
      "south",
      "southwest",
      "east",
      "north",
      "west",
    ]);
  });

  it("mockup'ın dört etiketi BİREBİR korunur, beşincisi 'Batı'dır", () => {
    expect(FACING_OPTIONS.map((option) => option.label)).toEqual([
      "Güney",
      "Güney-Batı",
      "Doğu",
      "Kuzey",
      "Batı",
    ]);
  });
});

describe("UE seçici listeleri — sunucu enum'larıyla TAM örtüşür", () => {
  it("UE 74 Ünite Türü: beş değer", () => {
    expect(UNIT_KIND_OPTIONS.map((option) => option.value)).toEqual([
      "apartment",
      "shop",
      "office",
      "warehouse",
      "parking",
    ]);
    expect(UNIT_KIND_OPTIONS.map((option) => option.label)).toEqual([
      "Daire",
      "Dükkan / Ticari",
      "Ofis",
      "Depo",
      "Otopark",
    ]);
  });

  it("UE 75 Oda Tipi: mockup'ın altı seçeneği (METİN olarak saklanır)", () => {
    expect([...UNIT_LAYOUT_OPTIONS]).toEqual([
      "1+0 (Stüdyo)",
      "1+1",
      "2+1",
      "3+1",
      "4+1",
      "5+1 Dubleks",
    ]);
  });

  it("UE 81 Otopark Hakkı: none · one_closed · two", () => {
    expect(PARKING_RIGHT_OPTIONS.map((option) => option.value)).toEqual([
      "none",
      "one_closed",
      "two",
    ]);
    expect(PARKING_RIGHT_OPTIONS.map((option) => option.label)).toEqual([
      "Yok",
      "1 Araç (Kapalı)",
      "2 Araç",
    ]);
  });

  it("UE 93 KDV Oranı: SADECE {1, 10, 20} (karar 9)", () => {
    expect(VAT_RATE_OPTIONS.map((option) => option.value)).toEqual(["1", "10", "20"]);
    expect(VAT_RATE_OPTIONS.map((option) => option.label)).toEqual([
      "%1 (150m² altı)",
      "%10",
      "%20 (Ticari)",
    ]);
  });

  it("UE 94 Durum: listed · reserved · sold · closed", () => {
    expect(SALES_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      "listed",
      "reserved",
      "sold",
      "closed",
    ]);
    expect(SALES_STATUS_OPTIONS.map((option) => option.label)).toEqual([
      "Satışta (Boş)",
      "Rezerve",
      "Satıldı",
      "Satışa Kapalı",
    ]);
  });

  it("UE 95 Sahiplik: contractor · landowner", () => {
    expect(OWNER_SIDE_OPTIONS.map((option) => option.value)).toEqual([
      "contractor",
      "landowner",
    ]);
    expect(OWNER_SIDE_OPTIONS.map((option) => option.label)).toEqual([
      "Yüklenici (Biz)",
      "Arsa Sahibi Payı",
    ]);
  });

  it("UE 73 ünite no sınırı sunucuyla aynıdır (30)", () => {
    expect(UNIT_NO_MAX_LENGTH).toBe(30);
  });
});

describe("UE 91 / 97-99 / 104-121 — pending gerekçeleri GÖRÜNÜRDÜR", () => {
  it("maliyet gerekçesi NEDEN elle girilemediğini söyler", () => {
    expect(UNIT_COST_PENDING_REASON).toMatch(/maliyet/i);
    expect(UNIT_COST_PENDING_REASON.length).toBeGreaterThan(20);
  });

  it("beklenen kâr gerekçesi maliyete bağlı olduğunu söyler", () => {
    expect(UNIT_EXPECTED_PROFIT_PENDING_REASON).toMatch(/maliyet/i);
  });

  it("UE 106-120 üç belge kutusu mockup'la birebirdir", () => {
    expect(UNIT_DOCUMENTS.map((item) => item.title)).toEqual([
      "Kat Planı",
      "Görseller / Render",
      "Kat İrtifakı Tapusu",
    ]);
    expect(UNIT_DOCUMENTS.map((item) => item.subtitle)).toEqual([
      "DWG veya PDF",
      "Satış broşürü için",
      "Bağımsız bölüm tapusu",
    ]);
    // Çıplak hex yasak — zeminler token'dır.
    for (const item of UNIT_DOCUMENTS) {
      expect(item.iconBg).toMatch(/^var\(--/);
    }
  });
});
