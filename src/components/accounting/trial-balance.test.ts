// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { TrialBalanceTotals } from "@/lib/api/hooks/useTrialBalance";

import { trialBalanceImbalance, trialBalanceRangeLabel } from "./trial-balance";

function totals(partial: Partial<TrialBalanceTotals>): TrialBalanceTotals {
  return {
    opening_debit: "0.00",
    opening_credit: "0.00",
    period_debit: "0.00",
    period_credit: "0.00",
    closing_debit: "0.00",
    closing_credit: "0.00",
    ...partial,
  };
}

describe("MZ:45 — dönem etiketi BİRİKİMLİ aralıktır", () => {
  it("Temmuz seçiliyken `Ocak–Temmuz 2026` basar (tek ay DEĞİL)", () => {
    expect(trialBalanceRangeLabel({ year: 2026, month: 7 })).toBe("Ocak–Temmuz 2026");
  });

  it("Ocak seçiliyken aralık TEK aya iner: `Ocak 2026`", () => {
    // "Ocak–Ocak 2026" aynı pencerenin gereksiz uzun yazımı olurdu.
    expect(trialBalanceRangeLabel({ year: 2026, month: 1 })).toBe("Ocak 2026");
  });

  it("Aralık seçiliyken yılın TAMAMIdır", () => {
    expect(trialBalanceRangeLabel({ year: 2025, month: 12 })).toBe("Ocak–Aralık 2025");
  });

  it("ayraç U+2013 (en dash) ve BOŞLUKSUZdur (MZ:45)", () => {
    // 🔴 Boşluklu/ASCII bir ayraç kadrajı sessizce oynatırdı (F-SEM dersi:
    // yalnız-boşluk metin düğümleri kareyi kaydırıyordu).
    expect(trialBalanceRangeLabel({ year: 2026, month: 7 })).toContain("–");
    expect(trialBalanceRangeLabel({ year: 2026, month: 7 })).not.toMatch(/\s[-–]\s/);
  });
});

describe("🔴 K2 · dengesizlik farkı — mizanın kapanış ikilisi", () => {
  it("borç > alacak: fark POZİTİF basılır", () => {
    expect(
      trialBalanceImbalance(totals({ closing_debit: "27466500.00", closing_credit: "21729500.00" })),
    ).toBe("5737000.00");
  });

  it("alacak > borç: fark yine POZİTİFtir (mutlak değer)", () => {
    // Banner "fark: ₺X" der; eksi işaretli bir X cümleyi anlamsızlaştırırdı.
    expect(
      trialBalanceImbalance(totals({ closing_debit: "21729500.00", closing_credit: "27466500.00" })),
    ).toBe("5737000.00");
  });

  it("dengede olan mizanda fark SIFIRdır", () => {
    expect(
      trialBalanceImbalance(totals({ closing_debit: "47284520.00", closing_credit: "47284520.00" })),
    ).toBe("0.00");
  });

  it("kuruş farkı YUTULMAZ", () => {
    expect(
      trialBalanceImbalance(totals({ closing_debit: "1000.00", closing_credit: "999.99" })),
    ).toBe("0.01");
  });

  /**
   * 🔴 AYRIŞMA NOKTASI (WORKFLOW §4 Ortak · para portu kanonu): değer testi
   * YALNIZ iki uygulamanın aynı cevabı verdiği aralıkta kalırsa mutasyonu
   * GEÇİRİR. Yukarıdaki dört iddia `Math.abs(Number(a) - Number(b))` ile de
   * YEŞİL kalır. Ayrışma 2⁵³'ün (9.007.199.254.740.992) üstünde başlar:
   * orada `double` tamsayı çözünürlüğünü kaybeder ve İKİ FARKLI toplam AYNI
   * sayıya düşer.
   */
  it("🔴 2⁵³ ÜSTÜNDE bile kuruşu korur — `Number()` uygulaması BURADA kırmızıdır", () => {
    const a = "9007199254740993.01";
    const b = "9007199254740992.01";
    // Kanıt: `Number()` yolu bu çiftte farkı 1.00 DEĞİL 2 görür — iki dize de
    // en yakın `double`a yuvarlanır (aralık 2⁵³ üstünde 2 birimdir) ve gerçek
    // fark %100 sapar. Uygulama farkı ekranda "fark: ₺2" diye basardı.
    expect(Math.abs(Number(a) - Number(b))).toBe(2);
    // Doğru uygulama tam farkı verir.
    expect(trialBalanceImbalance(totals({ closing_debit: a, closing_credit: b }))).toBe("1.00");
  });

  /**
   * İkinci ve BAĞIMSIZ katman (aynı kanonun (b) maddesi): değer testi bir gün
   * ayrışma noktasını kaçırırsa bile kaynak metni `Number(`/`Math.` içermez.
   */
  it("🔴 YAPISAL YASAK: modül `Number(` ya da `Math.` ile para aritmetiği yapmaz", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./trial-balance.ts", import.meta.url)),
      "utf8",
    );
    // Yorum satırları hariç tutulur: gerekçe metni "Number(a) - Number(b)
    // YASAK" cümlesini AÇIKÇA içerir ve bu bir kullanım değildir.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bNumber\(/);
    expect(code).not.toMatch(/\bMath\./);
    expect(code).toContain("subtractDecimalStrings");
  });
});
