// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  DOCUMENT_TYPE_LABELS,
  INVOICE_PAYMENT_METHOD_LABELS,
  PAYMENT_KIND_LABELS,
  invoiceSource,
  invoiceStatusLabel,
  invoiceStatusVariant,
  monthRangeOf,
  OUTGOING_STATUS_FILTERS,
  statusForFilterValue,
} from "./invoice-labels";

const NO_SOURCE = {
  progress_payment_id: null,
  subcontractor_progress_payment_id: null,
  equipment_rental_invoice_id: null,
  purchase_order_id: null,
};

describe("invoiceStatusLabel — K1 'Vadeli' AYRI DURUM DEĞİLDİR", () => {
  it("vadesi DOLU `sent` fatura 'Vadeli' yazar (FY:119)", () => {
    expect(invoiceStatusLabel("sent", "2026-08-18")).toBe("Vadeli");
    expect(invoiceStatusVariant("sent", "2026-08-18")).toBe("warning");
  });

  it("vadesi BOŞ `sent` fatura 'Gönderildi' yazar — aynı durum, farklı etiket", () => {
    expect(invoiceStatusLabel("sent", null)).toBe("Gönderildi");
    expect(invoiceStatusVariant("sent", null)).toBe("primary");
  });

  it("boş DİZE de vadesizdir (sunucu boş metin dönerse 'Vadeli' UYDURULMAZ)", () => {
    expect(invoiceStatusLabel("sent", "")).toBe("Gönderildi");
  });

  it("diğer beş durumun etiketi vadeden ETKİLENMEZ", () => {
    for (const dueDate of [null, "2026-08-18"]) {
      expect(invoiceStatusLabel("draft", dueDate)).toBe("Taslak");
      expect(invoiceStatusLabel("collected", dueDate)).toBe("Tahsil Edildi");
      expect(invoiceStatusLabel("pending", dueDate)).toBe("Onay Bekliyor");
      expect(invoiceStatusLabel("approved", dueDate)).toBe("Onaylandı");
      expect(invoiceStatusLabel("disputed", dueDate)).toBe("İtiraz Edildi");
    }
  });

  it("tahsil edilen yeşil, itiraz edilen kırmızıdır (FY:130 · FGE)", () => {
    expect(invoiceStatusVariant("collected", null)).toBe("success");
    expect(invoiceStatusVariant("approved", null)).toBe("success");
    expect(invoiceStatusVariant("disputed", null)).toBe("danger");
    expect(invoiceStatusVariant("pending", null)).toBe("warning");
  });
});

describe("durum süzgeci (FY:91) — 'Vadeli' sunucuda `sent`e eşlenir", () => {
  it("üç seçenek de mockup etiketlerini taşır", () => {
    expect(OUTGOING_STATUS_FILTERS.map((option) => option.label)).toEqual([
      "Gönderildi",
      "Tahsil Edildi",
      "Vadeli",
    ]);
  });

  it("'Vadeli' ile 'Gönderildi' AYNI sunucu durumunu üretir (K1)", () => {
    expect(statusForFilterValue("due")).toBe("sent");
    expect(statusForFilterValue("sent")).toBe("sent");
    expect(statusForFilterValue("collected")).toBe("collected");
  });

  it("tanınmayan/boş değer süzgeç ÜRETMEZ (uydurma parametre 422 olurdu)", () => {
    expect(statusForFilterValue(null)).toBeUndefined();
    expect(statusForFilterValue("")).toBeUndefined();
    expect(statusForFilterValue("vadeli")).toBeUndefined();
  });
});

describe("enum etiketleri — İKİ ödeme kümesi BİRLEŞTİRİLMEZ", () => {
  it("belge tipi kümesi FK:136-139 ile birebirdir", () => {
    expect(Object.keys(DOCUMENT_TYPE_LABELS)).toEqual([
      "einvoice",
      "earchive",
      "refund",
      "withholding",
    ]);
    expect(DOCUMENT_TYPE_LABELS.einvoice).toBe("e-Fatura (Satış)");
    expect(DOCUMENT_TYPE_LABELS.withholding).toBe("Tevkifatlı Fatura");
  });

  it("🔴 BEKÇİ: faturada `credit_card` VAR, `promissory_note` YOK", () => {
    const keys = Object.keys(INVOICE_PAYMENT_METHOD_LABELS);
    expect(keys).toContain("credit_card");
    expect(keys).not.toContain("promissory_note");
    expect(keys).toEqual(["transfer", "cheque", "cash", "credit_card"]);
  });

  it("🔴 BEKÇİ: ödeme satırında `promissory_note` VAR, `credit_card` YOK", () => {
    const keys = Object.keys(PAYMENT_KIND_LABELS);
    expect(keys).toContain("promissory_note");
    expect(keys).not.toContain("credit_card");
    expect(keys).toEqual(["transfer", "cheque", "promissory_note", "cash"]);
    expect(PAYMENT_KIND_LABELS.promissory_note).toBe("Senet"); // FGI:227
  });
});

describe("invoiceSource — bağlantı UYDURULMAZ", () => {
  it("işveren hakedişi GERÇEK rotaya bağlanır", () => {
    const source = invoiceSource({ ...NO_SOURCE, progress_payment_id: "pp-1" });
    expect(source).toEqual({
      label: "İşveren Hakedişi",
      href: "/hakedisler/pp-1",
      reason: null,
    });
  });

  it("taşeron hakedişi kendi rotasına bağlanır", () => {
    expect(invoiceSource({ ...NO_SOURCE, subcontractor_progress_payment_id: "sp-1" })?.href).toBe(
      "/hakedisler/taseron/sp-1",
    );
  });

  it("🔴 BEKÇİ: rotası OLMAYAN kaynakta `href` null'dır ve gerekçe DOLUDUR", () => {
    const rental = invoiceSource({ ...NO_SOURCE, equipment_rental_invoice_id: "ri-1" });
    expect(rental?.href).toBeNull();
    expect(rental?.reason).toBe("Makine kira faturasının detay ekranı henüz yazılmadı.");

    const order = invoiceSource({ ...NO_SOURCE, purchase_order_id: "po-1" });
    expect(order?.href).toBeNull();
    expect(order?.reason).toBe("Sipariş detay ekranı henüz yazılmadı.");
  });

  it("kaynaksız fatura `null` döner (boş çip basılır, sahte bağ değil)", () => {
    expect(invoiceSource(NO_SOURCE)).toBeNull();
  });
});

describe("monthRangeOf — YEREL takvim (UTC kayması yok)", () => {
  it("ayın ilk ve son gününü verir", () => {
    // 15 Temmuz 2026, yerel saat 12:00.
    const range = monthRangeOf(new Date(2026, 6, 15, 12, 0, 0));
    expect(range).toEqual({ year: 2026, month: 7, from: "2026-07-01", to: "2026-07-31" });
  });

  it("30 günlük ay ve artık yıl Şubat'ı doğru biter", () => {
    expect(monthRangeOf(new Date(2026, 3, 10)).to).toBe("2026-04-30");
    expect(monthRangeOf(new Date(2024, 1, 10)).to).toBe("2024-02-29");
    expect(monthRangeOf(new Date(2026, 1, 10)).to).toBe("2026-02-28");
  });

  it("🔴 BEKÇİ: ayın İLK gününün gece yarısı ÖNCESİ hâlâ o aydadır", () => {
    // `toISOString()` kullanılsaydı TR (UTC+3) saatinde 1 Ağustos 00:30 →
    // "2026-07-31" olur ve ekran bir ÖNCEKİ ayı gösterirdi.
    const range = monthRangeOf(new Date(2026, 7, 1, 0, 30, 0));
    expect(range.month).toBe(8);
    expect(range.from).toBe("2026-08-01");
  });

  it("🔴 BEKÇİ: yıl sonu ayın son gününde bir sonraki yıla TAŞMAZ", () => {
    const range = monthRangeOf(new Date(2026, 11, 31, 23, 30, 0));
    expect(range).toEqual({ year: 2026, month: 12, from: "2026-12-01", to: "2026-12-31" });
  });
});
