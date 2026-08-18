import { describe, expect, it } from "vitest";

import {
  defaultIncomeStatementPeriod,
  incomeStatementDifference,
  incomeStatementRangeLabel,
  isIncomeStatementReconciled,
  isLatestIncomeStatementPeriod,
  revenueSharePercent,
} from "./income-statement";

/**
 * F-MT2 T1 · Gelir Tablosu ekranının SAF katmanı. Kanonik mockup
 * `Ekran 11 - Mali Tablo.dc.html` (E11); yorumlardaki sayılar O dosyanın
 * SATIR numaralarıdır. Bu modülde AĞ ve DOM yoktur.
 *
 * 🔴 MT-2 KANONU: *"%100 kapsam bir doğruluk kanıtı değildir"*. Toplam
 * iddiaları sabit beklenen sayı yazmak yerine KÜMEYİ KURUP sonucu türetir.
 */

describe("🔴 K1 · mutabakat farkı — `total_revenue − total_expense` ile `period_profit`", () => {
  it("aktarım fişi ATILMAMIŞ defterde fark SIFIRDIR", () => {
    // Küme kurulur, beklenen sayı TÜRETİLİR (elle yazılmaz).
    const revenue = "24994700.00";
    const expense = "21482000.00";
    const profit = String(Number(revenue) - Number(expense));

    expect(isIncomeStatementReconciled(revenue, expense, profit)).toBe(true);
    expect(incomeStatementDifference(revenue, expense, profit)).toBe("0.00");
  });

  it("🔴 ÖLÇEK farkı sıfırı gizlemez: `0` · `0.00` · `-0.000` hepsi mutabıktır", () => {
    expect(isIncomeStatementReconciled("100", "40", "60.0000")).toBe(true);
    expect(isIncomeStatementReconciled("100.00", "40", "60")).toBe(true);
  });

  it("🔴 aktarım fişi ATILMIŞ defterde fark SIFIR DEĞİLDİR ve işaretini korur", () => {
    // `period_profit()` maliyet aktarım hesaplarını SAYAR; kalemler saymaz.
    // Fark = tam olarak o 12 hesabın neti (burada 512.700 fazla kâr).
    const revenue = "24994700.00";
    const expense = "21482000.00";
    const profit = "3000000.00";

    expect(isIncomeStatementReconciled(revenue, expense, profit)).toBe(false);
    // 3.512.700 − 3.000.000 = 512.700 · KAYIPSIZ çıkarma.
    expect(incomeStatementDifference(revenue, expense, profit)).toBe("512700.00");
  });

  it("fark TERS yönde de doğru işaretlenir", () => {
    expect(incomeStatementDifference("100.00", "40.00", "70.00")).toBe("-10.00");
    expect(isIncomeStatementReconciled("100.00", "40.00", "70.00")).toBe(false);
  });

  it("🔴 KURUŞ KAÇAĞI yutulmaz — bir kuruşluk sapma MUTABIK SAYILMAZ", () => {
    // `Number()` aritmetiğiyle yazılmış bir uygulama burada da yeşil kalırdı;
    // asıl ayrışma noktası aşağıdaki 2⁵³ testidir.
    expect(isIncomeStatementReconciled("100.00", "40.00", "59.99")).toBe(false);
    expect(incomeStatementDifference("100.00", "40.00", "59.99")).toBe("0.01");
  });

  it("🔴 AYRIŞMA NOKTASI · 2⁵³ üstü tutarda float aritmetiği YALAN söyler", () => {
    // 9.007.199.254.740.993 IEEE-754 çift duyarlıkta TEMSİL EDİLEMEZ.
    const revenue = "9007199254740993.00";
    const expense = "0.00";
    const profit = "9007199254740992.00";

    // Float ile: Number(revenue) === Number(profit) ⇒ "mutabık" derdi.
    expect(Number(revenue) - Number(expense) - Number(profit)).toBe(0);
    // KAYIPSIZ aritmetik gerçeği söyler: 1 TL fark vardır.
    expect(isIncomeStatementReconciled(revenue, expense, profit)).toBe(false);
    expect(incomeStatementDifference(revenue, expense, profit)).toBe("1.00");
  });
});

describe("🔴 K1.4 · oran/marj — `total_revenue === 0` guard'ı FRONTEND'dedir", () => {
  it("E11:142 net marj = `period_profit / total_revenue`", () => {
    // Mockup'ın %14,1'i: 3.512.700 / 24.994.700.
    const percent = revenueSharePercent("3512700.00", "24994700.00");
    expect(percent).not.toBeNull();
    expect(percent).toBeCloseTo(14.05, 2);
  });

  it("E11:117-126 gider kalemi oranı da AYNI paydadan (`total_revenue`) çıkar", () => {
    // Mockup: 12.480.000 / 24.994.700 = %49,9 · 42.000 / 24.994.700 = %0,2
    expect(revenueSharePercent("12480000.00", "24994700.00")).toBeCloseTo(49.93, 2);
    expect(revenueSharePercent("42000.00", "24994700.00")).toBeCloseTo(0.168, 3);
  });

  it("🔴 SIFIR gelir `NaN`/`Infinity` BASMAZ, `null` döner", () => {
    expect(revenueSharePercent("3512700.00", "0")).toBeNull();
    // Ölçek farkı sıfırı gizlemez (`isZeroDecimalString` kanonu).
    expect(revenueSharePercent("3512700.00", "0.00")).toBeNull();
    expect(revenueSharePercent("0.00", "0.00")).toBeNull();
  });

  it("🔴 SIFIR pay bir yön DEĞİLDİR ama geçerli bir orandır: `0`", () => {
    expect(revenueSharePercent("0.00", "24994700.00")).toBe(0);
  });

  it("NEGATİF kalem (iade hacmi) oranı da negatif döner — `0`a KIRPILMAZ", () => {
    expect(revenueSharePercent("-2499470.00", "24994700.00")).toBeCloseTo(-10, 6);
  });

  it("anlamsız girdi `NaN` SIZDIRMAZ", () => {
    expect(revenueSharePercent("abc", "24994700.00")).toBeNull();
    expect(revenueSharePercent("100", "abc")).toBeNull();
  });
});

describe("E11:79 · dönem gezgini — BİRİKİMLİ aralık (nokta-zaman DEĞİL)", () => {
  it("mockup'ın `Ocak – Temmuz 2026` aralığı dönemden TÜRER", () => {
    expect(incomeStatementRangeLabel({ year: 2026, month: 7 })).toBe("Ocak–Temmuz 2026");
  });

  it("Ocak'ta aralığın iki ucu AYNIdır; kısa yazım basılır", () => {
    expect(incomeStatementRangeLabel({ year: 2026, month: 1 })).toBe("Ocak 2026");
  });

  it("🔴 varsayılan dönem YEREL takvimden gelir (`toISOString()` UTC'ye kaydırırdı)", () => {
    // 31 Aralık 2026, TR saatiyle 23:00 — UTC'de artık 2027'dir.
    expect(defaultIncomeStatementPeriod(new Date(2026, 11, 31, 23, 0, 0))).toEqual({
      year: 2026,
      month: 12,
    });
  });

  it("🔴 GELECEK dönem yoktur: içinde bulunulan ay EN SON dönemdir", () => {
    const today = new Date(2026, 6, 20);
    expect(isLatestIncomeStatementPeriod({ year: 2026, month: 7 }, today)).toBe(true);
    expect(isLatestIncomeStatementPeriod({ year: 2026, month: 6 }, today)).toBe(false);
    // Yıl sınırı: 2025/12 geçmiştir, 2027/01 gelecektir (ikisi de "en son" DEĞİL
    // ama ileri gitmeye kapalı olan yalnız bugünün ayı ve sonrasıdır).
    expect(isLatestIncomeStatementPeriod({ year: 2025, month: 12 }, today)).toBe(false);
    expect(isLatestIncomeStatementPeriod({ year: 2026, month: 8 }, today)).toBe(true);
  });
});
