import { describe, expect, it } from "vitest";

import { SALES_LIST_HREF } from "@/components/unit-shell/routes";

import {
  ALLOCATION_CANCEL_HREF,
  ALLOCATION_CONTRACTOR_LABEL,
  ALLOCATION_FORM_TITLE,
  ALLOCATION_LANDOWNER_LABEL,
  ALLOCATION_MAX_ITEMS,
  ALLOCATION_NO_CHANGES_MESSAGE,
  ALLOCATION_PDF_LABEL,
  ALLOCATION_PDF_PENDING_REASON,
  ALLOCATION_UNASSIGNED_LABEL,
  ALLOCATION_UNCOMPUTABLE,
  autoDistributeLabel,
} from "./constants";

describe("PG etiketleri", () => {
  it("başlık ve satır içi atama düğmeleri mockup'tan BİREBİRDİR", () => {
    expect(ALLOCATION_FORM_TITLE).toBe("Kat Karşılığı Paylaşım Girişi"); // PG 53
    expect(ALLOCATION_CONTRACTOR_LABEL).toBe("Biz"); // PG 140
    expect(ALLOCATION_LANDOWNER_LABEL).toBe("Arsa"); // PG 141
    expect(ALLOCATION_UNASSIGNED_LABEL).toBe("Atanmadı"); // PG 144
  });

  it("İptal hedefi kabuk canonudur — PG'nin işaret ettiği rota henüz YOK", () => {
    expect(ALLOCATION_CANCEL_HREF).toBe(SALES_LIST_HREF);
  });
});

describe("🔴 PG 101 'Otomatik Dağıt (%55/%45)' — oran ÖRNEK VERİDİR", () => {
  it("etiket sözleşme oranından TÜRETİLİR, mockup'tan kopyalanmaz", () => {
    expect(autoDistributeLabel("55.00", "45.00")).toBe("Otomatik Dağıt (%55/%45)");
  });

  it("başka bir sözleşme başka bir etiket üretir", () => {
    expect(autoDistributeLabel("60.00", "40.00")).toBe("Otomatik Dağıt (%60/%40)");
  });

  it("ondalıklı oran ondalığını KORUR", () => {
    expect(autoDistributeLabel("57.50", "42.50")).toBe("Otomatik Dağıt (%57,5/%42,5)");
  });
});

describe("🔴 PG 270-272 'Paylaşım tutanağı PDF' — sunucuda karşılığı YOK", () => {
  it("kutucuk SİLİNMEZ: etiket + GÖRÜNÜR gerekçe taşır", () => {
    expect(ALLOCATION_PDF_LABEL).toContain("PDF");
    expect(ALLOCATION_PDF_PENDING_REASON.trim()).not.toBe("");
    expect(ALLOCATION_PDF_PENDING_REASON.length).toBeGreaterThan(20);
  });
});

describe("Sunucu sınırları ve hesaplanamaz hâl", () => {
  it("tek istekte en fazla 500 satır (`_MAX_ALLOCATION_ITEMS`)", () => {
    expect(ALLOCATION_MAX_ITEMS).toBe(500);
  });

  it("'hesaplanamaz' SIFIR DEĞİLDİR — ayrı bir metinle basılır", () => {
    expect(ALLOCATION_UNCOMPUTABLE).toBe("—");
    expect(ALLOCATION_UNCOMPUTABLE).not.toBe("0");
  });

  it("değişiklik yokken kaydın engellendiği SÖYLENİR (uç min_length=1 ister)", () => {
    expect(ALLOCATION_NO_CHANGES_MESSAGE.trim()).not.toBe("");
  });
});
