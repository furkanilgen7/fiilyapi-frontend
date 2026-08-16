// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { VatReturnResponse } from "@/lib/api/hooks/useVatReturn";

import {
  buildVatTaxableRows,
  vatDeductionBaseTotal,
  vatOutcome,
  vatRateLabel,
  vatTaxableBaseTotal,
} from "./vat-return";

function response(partial: Partial<VatReturnResponse> = {}): VatReturnResponse {
  return {
    year: 2026,
    month: 6,
    due_date: "2026-07-28",
    calculated_vat: "824000.00",
    deductible_vat: "412000.00",
    payable: "412000.00",
    carried_forward: "0.00",
    taxable_rows: [{ rate: "20.00", base: "4120000.00", vat: "824000.00" }],
    exempt_base: "0.00",
    deductions: [{ source: "Alışlar", base: "2060500.00", vat: "412000.00" }],
    ...partial,
  };
}

describe("KDV:86 — oran etiketi", () => {
  it("sondaki sıfırları atar: `20.00` → `%20`", () => {
    expect(vatRateLabel("20.00")).toBe("%20");
  });

  it("kesirli oranı korur: `1.50` → `%1,5` (tr-TR ondalık ayracı)", () => {
    expect(vatRateLabel("1.50")).toBe("%1,5");
  });
});

describe("KDV:83-95 — Tablo 1'in gövde satırları", () => {
  it("🔴 `İşlem` sütunu ORANDAN türer — sınıflandırma UYDURULMAZ", () => {
    const rows = buildVatTaxableRows(response());
    // Mockup'ın `"Yurt İçi Teslimler"` metni (KDV:85) veri modelinde YOK.
    expect(rows[0]?.label).toBe("%20 oranlı teslimler");
    expect(rows[0]?.label).not.toContain("Yurt İçi");
  });

  it("🔴 İSTİSNA SATIRI `exempt_base`ten ELLE kurulur ve SONA konur", () => {
    const rows = buildVatTaxableRows(response({ exempt_base: "500000.00" }));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      label: "İstisna İşlemler",
      // Oran YOKTUR (sıfır DEĞİL): hücre `—` basar (KDV:92).
      rate: "—",
      base: "500000.00",
      // Vergisi TANIM GEREĞİ sıfırdır; sunucudan gelen bir alan değildir.
      vat: "0",
      isExempt: true,
    });
  });

  it("çok oranlı dönemde her oran KENDİ satırıdır, istisna yine SONdadır", () => {
    const rows = buildVatTaxableRows(
      response({
        taxable_rows: [
          { rate: "20.00", base: "4120000.00", vat: "824000.00" },
          { rate: "10.00", base: "1000000.00", vat: "100000.00" },
        ],
        exempt_base: "250000.00",
      }),
    );
    expect(rows.map((row) => row.label)).toEqual([
      "%20 oranlı teslimler",
      "%10 oranlı teslimler",
      "İstisna İşlemler",
    ]);
  });

  it("hiç oran satırı yoksa bile istisna satırı BASILIR (boş dönem)", () => {
    const rows = buildVatTaxableRows(response({ taxable_rows: [], exempt_base: "0.00" }));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isExempt).toBe(true);
  });
});

describe("KDV:99 · :128 — matrah toplamları SUNUCUDAN GELMEZ", () => {
  it("Tablo 1 matrah toplamı GÖRÜNEN sütunu toplar (istisna DÂHİL)", () => {
    // 🔴 Toplam satırı, üstündeki sütunla UZLAŞMAK zorundadır: istisnayı
    // dışarıda bırakırsak kullanıcı sütunu topladığında başka sayı bulur.
    const rows = buildVatTaxableRows(response({ exempt_base: "500000.00" }));
    expect(vatTaxableBaseTotal(rows)).toBe("4620000.00");
  });

  it("mockup'ın kendi örneğinde (istisna `0`) toplam KDV:99'a eşittir", () => {
    expect(vatTaxableBaseTotal(buildVatTaxableRows(response()))).toBe("4120000.00");
  });

  it("İndirim matrah toplamı `deductions` üzerinden kurulur", () => {
    expect(
      vatDeductionBaseTotal([
        { source: "Alışlar", base: "1642500.00", vat: "328500.00" },
        { source: "Diğer", base: "418000.00", vat: "83500.00" },
      ]),
    ).toBe("2060500.00");
  });

  it("indirim yoksa toplam sıfırdır (boş dizi `sumDecimalStrings`i patlatmaz)", () => {
    expect(vatDeductionBaseTotal([])).toBe("0");
  });

  /**
   * 🔴 AYRIŞMA NOKTASI (WORKFLOW §4 Ortak): kuruşlu ve ÇOK terimli bir toplam,
   * `Number()` ile toplandığında IEEE-754 kalıntısı üretir ve ekranda görünür
   * (`4120000.30000000004` gibi). `sumDecimalStrings` `BigInt` ölçekler.
   */
  it("🔴 kuruşlu çok terimli toplamda `Number()` kalıntı üretir, bu uygulama ÜRETMEZ", () => {
    const bases = ["0.1", "0.2", "0.3"];
    // Kanıt: float toplamı tam DEĞİLdir.
    expect(bases.reduce((sum, value) => sum + Number(value), 0)).not.toBe(0.6);
    const rows = buildVatTaxableRows(
      response({
        taxable_rows: [
          { rate: "20.00", base: "0.1", vat: "0.02" },
          { rate: "10.00", base: "0.2", vat: "0.02" },
        ],
        exempt_base: "0.3",
      }),
    );
    expect(vatTaxableBaseTotal(rows)).toBe("0.6");
  });

  it("🔴 YAPISAL YASAK: modül para toplamını `Number(`/`Math.` ile yapmaz", () => {
    const source = readFileSync(fileURLToPath(new URL("./vat-return.ts", import.meta.url)), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bNumber\(/);
    expect(code).not.toMatch(/\bMath\./);
    expect(code).toContain("sumDecimalStrings");
  });
});

describe("🔴 K1 — sonuç dalı: ÖDENECEK ↔ DEVREDEN", () => {
  it("ödenecek dalı (mockup dalı): turuncu kart + vade + tarih satırı", () => {
    const outcome = vatOutcome(response());
    expect(outcome).toEqual({
      kind: "payable",
      amount: "412000.00",
      cardTitle: "Ödenecek KDV",
      cardNote: "Vade: 28.07.2026", // KDV:68 — NOKTALI biçim
      resultTitle: "Ödenecek KDV (824.000 – 412.000)", // KDV:138
      resultDate: "Son ödeme tarihi: 28 Temmuz 2026", // KDV:139 — UZUN biçim
    });
  });

  it("🔴 devreden dalı (mockup'ta ÇİZİLMEMİŞ): başlık, tutar ve not DEĞİŞİR", () => {
    const outcome = vatOutcome(
      response({
        calculated_vat: "412000.00",
        deductible_vat: "824000.00",
        payable: "0.00",
        carried_forward: "412000.00",
      }),
    );
    expect(outcome.kind).toBe("carried");
    expect(outcome.amount).toBe("412000.00");
    expect(outcome.cardTitle).toBe("Devreden KDV");
    expect(outcome.cardNote).toBe("Gelecek döneme devreder");
  });

  it("🔴 devreden dalında aritmetik TERS yazılır (B − A)", () => {
    const outcome = vatOutcome(
      response({
        calculated_vat: "412000.00",
        deductible_vat: "824000.00",
        payable: "0.00",
        carried_forward: "412000.00",
      }),
    );
    // Ödenecek dalı `A – B` yazar; devredende para ters yöndedir.
    expect(outcome.resultTitle).toBe("Devreden KDV (824.000 – 412.000)");
  });

  it("🔴 devreden dalında TARİH SATIRI HİÇ BASILMAZ", () => {
    // Ödenecek tutar sıfırken "son ödeme tarihi" OLGUSAL OLARAK YANLIŞTIR;
    // metin uydurmak yerine satır ATLANIR.
    const outcome = vatOutcome(
      response({ payable: "0.00", carried_forward: "1.00" }),
    );
    expect(outcome.resultDate).toBeNull();
  });

  /**
   * 🔴 VARSAYILAN YOL (MU-2 dersi: her test bayrağı açıkça geçerse varsayılan
   * yol bekçisizdir). `payable` ve `carried_forward` AYNI ANDA sıfır olabilir
   * (fark tam sıfır); dallanma `carried_forward` üzerinde olduğu için mockup'ın
   * dalına düşer.
   */
  it("🔴 fark TAM SIFIRken mockup dalı (ödenecek ₺0) basılır ve vade GERÇEKTİR", () => {
    const outcome = vatOutcome(
      response({
        calculated_vat: "500000.00",
        deductible_vat: "500000.00",
        payable: "0.00",
        carried_forward: "0.00",
      }),
    );
    expect(outcome.kind).toBe("payable");
    expect(outcome.amount).toBe("0.00");
    // Şema notu: `due_date` boş dönemde bile DOLUdur (vade TAKVİME bağlıdır).
    expect(outcome.resultDate).toBe("Son ödeme tarihi: 28 Temmuz 2026");
  });

  it("dallanma ÖLÇEKTEN etkilenmez: `0` · `0.00` · `0.0000` hepsi sıfırdır", () => {
    for (const zero of ["0", "0.00", "0.0000"]) {
      expect(vatOutcome(response({ carried_forward: zero })).kind).toBe("payable");
    }
  });
});
