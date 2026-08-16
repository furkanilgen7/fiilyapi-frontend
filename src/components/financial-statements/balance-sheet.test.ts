// @vitest-environment node
// `trial-balance.test.ts` ile AYNI gerekçe: DOM'suz saf katman + dosya
// sistemini okuyan yapısal bekçi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { BalanceSheetResponse, BalanceSheetSide } from "@/lib/api/hooks/useBalanceSheet";

import { balanceSheetAsOfOptions, balanceSheetImbalance } from "./balance-sheet";

function side(total: string): BalanceSheetSide {
  return { key: "assets", title: "AKTİF (Varlıklar)", total_label: "AKTİF TOPLAM", total, sections: [] };
}

function response(assetsTotal: string, liabilitiesTotal: string): BalanceSheetResponse {
  return {
    as_of: "2026-07-31",
    is_balanced: assetsTotal === liabilitiesTotal,
    assets: side(assetsTotal),
    liabilities: side(liabilitiesTotal),
  };
}

describe("BL:37 — `as_of` seçenekleri NOKTA-ZAMANDIR (mizanın aralığı DEĞİL)", () => {
  it("Temmuz 2026'da mockup'ın ÜÇ seçeneğini birebir üretir", () => {
    // BL:37 `31 Temmuz 2026` / `30 Haziran 2026` / `31 Aralık 2025`.
    const options = balanceSheetAsOfOptions(new Date(2026, 6, 20, 9, 0, 0));
    expect(options.map((o) => o.label)).toEqual([
      "31 Temmuz 2026",
      "30 Haziran 2026",
      "31 Aralık 2025",
    ]);
    expect(options.map((o) => o.value)).toEqual(["2026-07-31", "2026-06-30", "2025-12-31"]);
  });

  it("ay sonu YEREL takvimden gelir — 30/31/29 gün doğru ayrışır", () => {
    // Şubat 2028 ARTIK yıldır: 29 çeker. `toISOString()` tabanlı bir üretim
    // TR saatinde bir gün geri kayardı (TB5 dersi).
    expect(balanceSheetAsOfOptions(new Date(2028, 1, 3))[0]?.value).toBe("2028-02-29");
    expect(balanceSheetAsOfOptions(new Date(2026, 3, 3))[0]?.value).toBe("2026-04-30");
  });

  it("🔴 OCAK'ta liste İKİYE iner — aynı gün İKİ KEZ sunulmaz", () => {
    // Ocak 2026'da "önceki ay sonu" ve "önceki yıl sonu" AYNI gündür
    // (2025-12-31). Yinelenen bir seçenek kullanıcıya iki farklı pencere
    // varmış gibi görünürdü.
    const options = balanceSheetAsOfOptions(new Date(2026, 0, 15));
    expect(options.map((o) => o.value)).toEqual(["2026-01-31", "2025-12-31"]);
  });
});

describe("🔴 K3 · dengesizlik farkı — AKTİF ile PASİF toplamı", () => {
  it("aktif > pasif: fark POZİTİF basılır", () => {
    expect(balanceSheetImbalance(response("20642220.00", "20502220.00"))).toBe("140000.00");
  });

  it("pasif > aktif: fark yine POZİTİFtir (mutlak değer)", () => {
    expect(balanceSheetImbalance(response("20502220.00", "20642220.00"))).toBe("140000.00");
  });

  it("dengede olan bilançoda fark SIFIRdır", () => {
    expect(balanceSheetImbalance(response("20642220.00", "20642220.00"))).toBe("0.00");
  });

  it("kuruş farkı YUTULMAZ", () => {
    expect(balanceSheetImbalance(response("1000.00", "999.99"))).toBe("0.01");
  });

  /**
   * 🔴 AYRIŞMA NOKTASI (para portu kanonu): değer testi YALNIZ iki uygulamanın
   * aynı cevabı verdiği aralıkta kalırsa mutasyonu GEÇİRİR. Yukarıdaki dört
   * iddia `Math.abs(Number(a) - Number(b))` ile de YEŞİL kalır.
   */
  it("🔴 2⁵³ ÜSTÜNDE kuruşu korur — `Number()` uygulaması BURADA kırmızıdır", () => {
    const a = "9007199254740993.01";
    const b = "9007199254740992.01";
    // Kanıt: `Number()` yolu farkı 1.00 DEĞİL 2 görür.
    expect(Math.abs(Number(a) - Number(b))).toBe(2);
    expect(balanceSheetImbalance(response(a, b))).toBe("1.00");
  });

  it("🔴 NEGATİF taraf toplamı da doğru ayrışır (geçmiş yıl zararı dalı)", () => {
    // K4: bir kalem — ve dolayısıyla bir taraf toplamı — NEGATİF çıkabilir.
    // `startsWith("-")` ile işaret atma yolu burada sınanır.
    expect(balanceSheetImbalance(response("-500000.00", "250000.00"))).toBe("750000.00");
    expect(balanceSheetImbalance(response("250000.00", "-500000.00"))).toBe("750000.00");
  });

  /** İkinci ve BAĞIMSIZ katman: kaynak metni para aritmetiğini float'a düşürmez. */
  it("🔴 YAPISAL YASAK: modül `Math.` ya da `Number(` ile para aritmetiği yapmaz", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./balance-sheet.ts", import.meta.url)),
      "utf8",
    );
    // Yorumlar hariç: gerekçe metni yasağın kendisini AÇIKÇA yazar.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bMath\./);
    expect(code).not.toMatch(/\bNumber\(/);
    expect(code).toContain("subtractDecimalStrings");
  });
});
