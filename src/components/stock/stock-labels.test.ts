import { describe, it, expect } from "vitest";

import {
  isStockRowHighlighted,
  parseStockCategory,
  parseStockStatus,
  stockBalanceTone,
  STOCK_CATEGORY_LABELS,
  STOCK_CATEGORY_OPTIONS,
  STOCK_STATUS_BADGE_VARIANTS,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_SEGMENTS,
} from "./stock-labels";

describe("kategori sözlüğü", () => {
  it("şemanın BEŞ enum değerini E3 etiketlerine çevirir", () => {
    expect(STOCK_CATEGORY_OPTIONS).toEqual([
      "structural",
      "steel",
      "electrical",
      "mechanical",
      "interior",
    ]);
    expect(STOCK_CATEGORY_LABELS.structural).toBe("Yapı Malzemesi");
    expect(STOCK_CATEGORY_LABELS.steel).toBe("Demir-Çelik");
    expect(STOCK_CATEGORY_LABELS.interior).toBe("İç Yapı");
  });

  it("mockup'ın enum'da olmayan 'Boya-Kaplama' seçeneği ÜRETİLMEZ", () => {
    expect(Object.values(STOCK_CATEGORY_LABELS)).not.toContain("Boya-Kaplama");
  });

  it("URL'den gelen tanınmayan kategori düşer (uydurma süzgeç gönderilmez)", () => {
    expect(parseStockCategory("steel")).toBe("steel");
    expect(parseStockCategory("boya")).toBeUndefined();
    expect(parseStockCategory(null)).toBeUndefined();
  });
});

describe("durum segmenti (E3 94-97)", () => {
  it("DÖRT düğmedir; 'Düşük' segmenti İCAT EDİLMEZ", () => {
    expect(STOCK_STATUS_SEGMENTS.map((s) => s.label)).toEqual([
      "Tümü",
      "Kritik",
      "Normal",
      "Fazla Stok",
    ]);
    expect(STOCK_STATUS_SEGMENTS.map((s) => s.value)).not.toContain("low");
  });

  it("'Tümü' süzgeç GÖNDERMEZ", () => {
    expect(STOCK_STATUS_SEGMENTS[0].value).toBeUndefined();
    expect(parseStockStatus(null)).toBeUndefined();
    expect(parseStockStatus("critical")).toBe("critical");
    // Segment'i olmayan `low` URL'den de gelemez (segmentle senkron kalır).
    expect(parseStockStatus("low")).toBeUndefined();
  });
});

describe("rozet renkleri (128 · 146 · 137 · 182)", () => {
  it("dört durumun da metni ve varyantı vardır", () => {
    expect(STOCK_STATUS_LABELS).toEqual({
      critical: "Kritik",
      low: "Düşük",
      normal: "Normal",
      excess: "Fazla",
    });
    expect(STOCK_STATUS_BADGE_VARIANTS).toEqual({
      critical: "danger",
      low: "warning",
      normal: "success",
      excess: "primary",
    });
  });
});

describe("stockBalanceTone — durum SUNUCUDAN gelir", () => {
  it("sunucu damgasını renge çevirir (yeniden hesap YOK)", () => {
    expect(stockBalanceTone("2.400", "critical")).toBe("danger");
    expect(stockBalanceTone("120.000", "low")).toBe("warning");
    expect(stockBalanceTone("840.000", "normal")).toBe("neutral");
    expect(stockBalanceTone("2800.000", "excess")).toBe("neutral");
  });

  it("min stok eşiği YOKSA (status null) bakiye nötr basılır", () => {
    // İstemci eşik formülü uygulasaydı burada bir rozet/renk uydururdu.
    expect(stockBalanceTone("40.000", null)).toBe("neutral");
  });

  it("EKSİ bakiye durumdan bağımsız KIRMIZIdır (meşru değer, hata değil)", () => {
    expect(stockBalanceTone("-5.000", null)).toBe("danger");
    expect(stockBalanceTone("-1.000", "normal")).toBe("danger");
    expect(stockBalanceTone("-0.001", "excess")).toBe("danger");
  });
});

describe("isStockRowHighlighted (121 · 139 · 166)", () => {
  it("kritik ve düşük satırlar vurgulanır, diğerleri vurgulanmaz", () => {
    expect(isStockRowHighlighted("critical")).toBe(true);
    expect(isStockRowHighlighted("low")).toBe(true);
    expect(isStockRowHighlighted("normal")).toBe(false);
    expect(isStockRowHighlighted("excess")).toBe(false);
    expect(isStockRowHighlighted(null)).toBe(false);
  });
});
