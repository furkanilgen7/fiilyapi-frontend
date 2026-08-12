import { describe, it, expect } from "vitest";

import {
  isStockRowHighlighted,
  parseStockCategory,
  parseStockStatus,
  siteStockEntryHref,
  siteStockRowAction,
  stockBalanceTone,
  SITE_STOCK_COLUMN_PENDING_REASON,
  SITE_STOCK_DETAIL_PENDING_REASON,
  SITE_STOCK_ORDER_PENDING_REASON,
  SITE_STOCK_STATUS_LABELS,
  STOCK_PURCHASING_PENDING_MODULE,
  STOCK_SITE_PLANNING_PENDING_MODULE,
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

// --- F-ST T3 · ŞS'ye özgü sözlük ---------------------------------------------

describe("SITE_STOCK_STATUS_LABELS — ŞS 'Yeterli' der, E3 'Normal'", () => {
  it("yalnız `normal` metni ayrışır; diğer üçü E3 ile aynıdır", () => {
    expect(SITE_STOCK_STATUS_LABELS.normal).toBe("Yeterli");
    expect(STOCK_STATUS_LABELS.normal).toBe("Normal");
    expect(SITE_STOCK_STATUS_LABELS.critical).toBe(STOCK_STATUS_LABELS.critical);
    expect(SITE_STOCK_STATUS_LABELS.low).toBe(STOCK_STATUS_LABELS.low);
    expect(SITE_STOCK_STATUS_LABELS.excess).toBe(STOCK_STATUS_LABELS.excess);
  });
});

describe("siteStockRowAction — satır düğmesi (S5 pending)", () => {
  it("etiket SUNUCUNUN durumundan seçilir", () => {
    expect(siteStockRowAction("critical").label).toBe("Acil Sipariş");
    expect(siteStockRowAction("low").label).toBe("Sipariş Ver");
    expect(siteStockRowAction("normal").label).toBe("Detay");
    expect(siteStockRowAction("excess").label).toBe("Detay");
  });

  it("eşiksiz kalem sipariş aciliyeti İMA ETMEZ", () => {
    expect(siteStockRowAction(null).label).toBe("Detay");
  });

  it("sipariş gerekçesi SA modülünün TEK kaynaktan gelen metnidir", () => {
    expect(siteStockRowAction("critical").reason).toBe("Satınalma modülüyle birlikte gelir");
    expect(siteStockRowAction("low").reason).toBe(SITE_STOCK_ORDER_PENDING_REASON);
    expect(siteStockRowAction("normal").reason).toBe(SITE_STOCK_DETAIL_PENDING_REASON);
  });
});

describe("pending sütun gerekçesi + T4 rota sözleşmesi", () => {
  it("'Aylık İhtiyaç'/'Bölüm' gerekçesi sunucunun `site_planning` anahtarındandır", () => {
    expect(SITE_STOCK_COLUMN_PENDING_REASON).toBe("Şantiye planlama türeviyle birlikte gelir");
    expect(STOCK_SITE_PLANNING_PENDING_MODULE).toBe("site_planning");
    expect(STOCK_PURCHASING_PENDING_MODULE).toBe("purchasing");
  });

  it("'+ Stok Girişi' şantiye kapsamlı rotaya gider (T4 bunu okuyacak)", () => {
    expect(siteStockEntryHref("p-1", "s-9")).toBe("/projeler/p-1/santiyeler/s-9/stok/giris");
  });
});
