import { describe, it, expect } from "vitest";

import type { HrDocumentTypeBreakdown } from "@/lib/api/hooks/useHrDocuments";

import {
  buildBreakdownRow,
  buildCriticalAlert,
  buildDocumentMetaLine,
  formatDayCount,
  formatProjectName,
  PENDING_VALUE,
  resolveDocumentName,
  resolveDocumentStatusLabel,
  resolveDocumentStatusVariant,
} from "./hr-documents-labels";

function breakdown(overrides: Partial<HrDocumentTypeBreakdown>): HrDocumentTypeBreakdown {
  return {
    type_id: "dt-1",
    type_name: "Sağlık Raporu",
    is_mandatory: true,
    validity_months: 12,
    total_documents: 0,
    valid: 0,
    expiring: 0,
    expired: 0,
    missing: 0,
    ...overrides,
  };
}

describe("buildCriticalAlert — BT 48-55", () => {
  it("süresi dolan belge yoksa bant HİÇ basılmaz", () => {
    expect(buildCriticalAlert({ expired: 0, expiring: 9 })).toBeNull();
  });

  it("metni BELGE sayacından kurar; personel sayısı UYDURMAZ", () => {
    const alert = buildCriticalAlert({ expired: 6, expiring: 28 });

    expect(alert?.title).toContain("6 belgenin süresi doldu");
    expect(alert?.title).not.toMatch(/personel/i);
    expect(alert?.detail).toContain("28 belge");
  });

  it("yaklaşan belge yoksa ikinci satır basılmaz", () => {
    expect(buildCriticalAlert({ expired: 2, expiring: 0 })?.detail).toBeNull();
  });
});

describe("buildBreakdownRow — BT 158-177", () => {
  it("oran etiketi mockup biçimindedir: kayıtlı / olması gereken (159)", () => {
    // BT 159 · "142 / 142" — 132 geçerli + 6 yaklaşan + 4 dolmuş, eksik yok.
    const row = buildBreakdownRow(
      breakdown({ valid: 132, expiring: 6, expired: 4, total_documents: 142, missing: 0 }),
    );

    expect(row.ratioLabel).toBe("142 / 142");
    expect(row.detailLabel).toBe("132 geçerli · 6 yaklaşan · 4 süresi dolmuş");
  });

  it("eksik kayıt paydayı büyütür (169 · '98 / 142')", () => {
    const row = buildBreakdownRow(
      breakdown({ valid: 91, expiring: 7, expired: 0, total_documents: 98, missing: 44 }),
    );

    expect(row.ratioLabel).toBe("98 / 142");
    expect(row.detailLabel).toBe("91 geçerli · 7 yaklaşan · 44 eksik");
  });

  it("yüzdeler yalnız çubuk genişliğidir ve toplamı 100'dür", () => {
    const row = buildBreakdownRow(
      breakdown({ valid: 16, expiring: 1, expired: 1, total_documents: 18, missing: 2 }),
    );

    const sum = row.segments.reduce((acc, segment) => acc + segment.percent, 0);
    expect(sum).toBeCloseTo(100);
    // Sıfır olan sayaç dilim ÜRETMEZ (görünmez çizgi olurdu).
    expect(row.segments.map((segment) => segment.key)).toEqual([
      "valid",
      "expiring",
      "expired",
      "missing",
    ]);
  });

  it("tüm sayaçlar sıfırsa çubuk ÇÖKMEZ (bölme hatası yok)", () => {
    const row = buildBreakdownRow(breakdown({}));

    expect(row.segments).toEqual([]);
    expect(row.ratioLabel).toBe("0 / 0");
    expect(row.detailLabel).toBe("Kayıt yok");
    for (const segment of row.segments) {
      expect(Number.isFinite(segment.percent)).toBe(true);
    }
  });
});

describe("hücre biçimlendiricileri", () => {
  it("proje adı null ise GERÇEK boşluk basar (98)", () => {
    expect(formatProjectName(null)).toBe(PENDING_VALUE);
    expect(formatProjectName("Kule A")).toBe("Kule A");
  });

  it("gün sayacı mockup biçimindedir (100, 147)", () => {
    expect(formatDayCount(27)).toBe("27 gün");
  });
});

describe("belge durumu — SERBEST string'e dayanıklılık", () => {
  it("bilinen durumları Türkçe etiketler", () => {
    expect(resolveDocumentStatusLabel("valid")).toBe("Geçerli");
    expect(resolveDocumentStatusVariant("expired")).toBe("danger");
  });

  it("bilinmeyen durumda ÇÖKMEZ; '—' + nötr rozete düşer", () => {
    expect(resolveDocumentStatusLabel("suspended_by_new_backend")).toBe(PENDING_VALUE);
    expect(resolveDocumentStatusVariant("suspended_by_new_backend")).toBe("neutral");
  });
});

describe("PD 130-141 · belge satırı", () => {
  it("adı katalog tipinden, yoksa serbest etiketten alır", () => {
    expect(resolveDocumentName({ type_name: "İSG Eğitimi", free_label: null })).toBe("İSG Eğitimi");
    expect(resolveDocumentName({ type_name: null, free_label: "Taahhütname" })).toBe("Taahhütname");
    expect(resolveDocumentName({ type_name: null, free_label: null })).toBe(PENDING_VALUE);
  });

  it("alt satır durum + geçerlilik tarihinden kurulur (dosya bilgisi YOK)", () => {
    const line = buildDocumentMetaLine({
      status: "valid",
      valid_until: "2027-06-30",
      issued_at: "2026-06-30",
    });

    expect(line).toBe("Geçerli · 30.06.2027 tarihine kadar");
    expect(line).not.toMatch(/PDF|MB/);
  });

  it("geçerlilik yoksa veriliş tarihine düşer", () => {
    expect(buildDocumentMetaLine({ status: "valid", valid_until: null, issued_at: "2026-01-05" })).toBe(
      "Geçerli · 05.01.2026 tarihinde verildi",
    );
  });

  it("iki tarih de yoksa yalnız durum kalır", () => {
    expect(buildDocumentMetaLine({ status: "expired", valid_until: null, issued_at: null })).toBe(
      "Süresi doldu",
    );
  });
});
