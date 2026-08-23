import { describe, it, expect } from "vitest";

import {
  formatAmount,
  formatDateDots,
  parseDateDots,
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyPrecise,
  formatDayMonthShort,
  formatDecimal,
  formatMonthYear,
  formatPercent,
  formatPeriod,
  formatPeriodLabel,
  formatPeriodShort,
  formatQuantity,
  formatWeekdayShort,
} from "./format";

describe("formatCompactCurrency", () => {
  it("milyonu M kisaltmasiyla verir", () => {
    expect(formatCompactCurrency("1500000.00")).toBe("₺ 1,5M");
  });
  it("tam milyonda ondalik basmaz", () => {
    expect(formatCompactCurrency(8000000)).toBe("₺ 8M");
  });
  it("binleri B kisaltmasiyla verir", () => {
    expect(formatCompactCurrency(800000)).toBe("₺ 800B");
  });
  it("sifiri oldugu gibi basar", () => {
    expect(formatCompactCurrency(0)).toBe("₺ 0");
  });
});

describe("formatCurrency", () => {
  it("binlik ayraciyla tam tutar verir", () => {
    expect(formatCurrency("24870500.00")).toBe("₺ 24.870.500");
  });
});

describe("formatPercent", () => {
  it("ondalikli yuzdeyi virgulle verir", () => {
    expect(formatPercent("42.50")).toBe("%42,5");
  });
  it("tam sayida ondalik basmaz", () => {
    expect(formatPercent("75.00")).toBe("%75");
  });
  it("sifiri basar", () => {
    expect(formatPercent(0)).toBe("%0");
  });
});

describe("formatMonthYear", () => {
  it("tr-TR kisa ay adiyla basar", () => {
    expect(formatMonthYear("2025-03-15")).toBe("Mar 2025");
  });
  it("aralik ayini Ara olarak basar", () => {
    expect(formatMonthYear("2026-12-01")).toBe("Ara 2026");
  });
});

// Ekran 13 · İş Kalemleri (BOQ) — tablo sayıları (spec §3.4).
// Tabloda ₺ sembolü YOKTUR (mockup 114–116, 176); mevcut formatCurrency ₺ bastığı
// için bu ekranda kullanılamaz.
describe("formatQuantity (miktar — en fazla 3 ondalık)", () => {
  it("sondaki sıfırları atar: 1240.000 → 1.240", () => {
    expect(formatQuantity("1240.000")).toBe("1.240");
  });
  it("ondalığı korur: 1240.500 → 1.240,5", () => {
    expect(formatQuantity("1240.500")).toBe("1.240,5");
  });
  it("üç ondalığa kadar basar: 0.125 → 0,125", () => {
    expect(formatQuantity("0.125")).toBe("0,125");
  });
});

describe("formatAmount (tutar / birim fiyat — en fazla 2 ondalık)", () => {
  it("iki ondalığa kadar: 280.00 → 280", () => {
    expect(formatAmount("280.00")).toBe("280");
  });
  it("büyük tutarı binlik ayraçla basar: 12399900.00 → 12.399.900", () => {
    expect(formatAmount("12399900.00")).toBe("12.399.900");
  });
  it("kalan ondalığı korur: 347200.50 → 347.200,5", () => {
    expect(formatAmount("347200.50")).toBe("347.200,5");
  });
  it("boş BOQ toplamını 0 basar", () => {
    expect(formatAmount("0.00")).toBe("0");
  });
});

describe("BOQ biçimlendiricileri ₺ basmaz", () => {
  it("formatQuantity ve formatAmount ₺ sembolü basmaz", () => {
    expect(formatQuantity("1240.000")).not.toContain("₺");
    expect(formatAmount("12399900.00")).not.toContain("₺");
  });
});

// P7 T2 · Hakediş listesi tutar sütunu (spec §S6: gross_total, kuruş hassasiyetli).
describe("formatCurrencyPrecise", () => {
  it("₺ öneki + binlik ayraçla tam tutar verir", () => {
    expect(formatCurrencyPrecise("2100000.00")).toBe("₺ 2.100.000");
  });
  it("kuruşu atmaz: 2100000.50 → ₺ 2.100.000,5", () => {
    expect(formatCurrencyPrecise("2100000.50")).toBe("₺ 2.100.000,5");
  });
  it("sifiri basar", () => {
    expect(formatCurrencyPrecise("0.00")).toBe("₺ 0");
  });
});

// P7 T2 · Hakediş dönemi (period_year/period_month → "Mayıs 2026").
describe("formatPeriod", () => {
  it("ay + yil basar", () => {
    expect(formatPeriod(2026, 5)).toBe("Mayıs 2026");
  });
  it("aralik ayini basar (12)", () => {
    expect(formatPeriod(2026, 12)).toBe("Aralık 2026");
  });
  it("ocak ayini basar (1)", () => {
    expect(formatPeriod(2026, 1)).toBe("Ocak 2026");
  });
});

// F-TH T2 · Ekran 2 tablo dönem hücresi ("Tem 2026", "Haz 2026", "May 2026").
describe("formatPeriodShort", () => {
  it("kisa ay adi + yil basar (mockup ornekleri)", () => {
    expect(formatPeriodShort(2026, 7)).toBe("Tem 2026");
    expect(formatPeriodShort(2026, 6)).toBe("Haz 2026");
    expect(formatPeriodShort(2026, 5)).toBe("May 2026");
  });
  it("aralik ayini basar (12)", () => {
    expect(formatPeriodShort(2026, 12)).toBe("Ara 2026");
  });
  it("ocak ayini basar (1)", () => {
    expect(formatPeriodShort(2026, 1)).toBe("Oca 2026");
  });
});

describe("formatDecimal", () => {
  it("sayı ve string girdiyi aynı biçimler", () => {
    expect(formatDecimal("1240.5", 3)).toBe(formatDecimal(1240.5, 3));
    expect(formatDecimal(1240.5, 3)).toBe("1.240,5");
  });
  it("verilen ondalık sınırına yuvarlar", () => {
    expect(formatDecimal("1.239", 2)).toBe("1,24");
  });
});

// F-PL T2 · Planlama ızgarasının gün başlıkları (P111-117) bu ikisinden kurulur.
describe("formatDayMonthShort", () => {
  it("gun + kisa ay basar (P111 bicimi)", () => {
    expect(formatDayMonthShort("2026-07-21")).toBe("21 Tem");
    expect(formatDayMonthShort("2026-08-03")).toBe("3 Ağu");
  });
  it("bozuk girdide ISO dizeyi oldugu gibi dondurur", () => {
    expect(formatDayMonthShort("2026-13-01")).toBe("2026-13-01");
  });
});

describe("formatWeekdayShort", () => {
  it("haftanin yedi gununu dogru kisaltir", () => {
    const week = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"];
    expect(week.map(formatWeekdayShort)).toEqual(["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]);
  });
  it("gun adi YEREL saatten etkilenmez (UTC kurulur)", () => {
    // 2026-01-01 Perşembe; yerel Date kurulsaydı TR'de gece yarısı kayması
    // riski olurdu.
    expect(formatWeekdayShort("2026-01-01")).toBe("Per");
  });
});

// F-OK T5 · `MM/YYYY` → Türkçe dönem. Backend dönemi ALT BAŞLIK METNİNE gömer
// (yapılandırılmış alan YOK) ve Türkçe ay adı sözlüğü TAŞIMAZ.
describe("formatPeriodLabel", () => {
  it("`MM/YYYY` kalıbını ay adına çevirir (Onay Kutusu :127 :220)", () => {
    expect(formatPeriodLabel("07/2026")).toBe("Temmuz 2026");
    expect(formatPeriodLabel("01/2026")).toBe("Ocak 2026");
    expect(formatPeriodLabel("12/2025")).toBe("Aralık 2025");
  });

  it("kalıba UYMAYAN girdi AYNEN döner (zarif düşüş — dönem taşımayan metin)", () => {
    expect(formatPeriodLabel("Kat 6–8")).toBe("Kat 6–8");
    expect(formatPeriodLabel("7/2026")).toBe("7/2026");
    expect(formatPeriodLabel("2026-07")).toBe("2026-07");
    expect(formatPeriodLabel("")).toBe("");
  });

  it("1-12 dışındaki ay numarası da AYNEN döner (sıfır dolgusu korunur)", () => {
    expect(formatPeriodLabel("00/2026")).toBe("00/2026");
    expect(formatPeriodLabel("13/2026")).toBe("13/2026");
  });
});

/* ── F-DATE: TR gösterim ⇄ ISO dönüşümü ───────────────────────────────────── */

describe("parseDateDots — formatDateDots'un TERSİ", () => {
  it("tam TR tarihi ISO'ya çevirir", () => {
    expect(parseDateDots("19.07.2026")).toBe("2026-07-19");
  });

  it("🔴 formatDateDots ile GİDİŞ-DÖNÜŞ kayıpsızdır", () => {
    // Tek kaynak iddiası: iki yardımcı birbirinin tam tersi olmalı, yoksa
    // primitive değeri sessizce kaydırır.
    for (const iso of ["2026-07-19", "2024-02-29", "2025-01-01", "2026-12-31"]) {
      expect(parseDateDots(formatDateDots(iso))).toBe(iso);
    }
  });

  it("yarım girdi BOŞ döner (yarım değer gövdeye sızmaz)", () => {
    expect(parseDateDots("19.07.20")).toBe("");
  });

  it("boş girdi BOŞ döner", () => {
    expect(parseDateDots("")).toBe("");
  });

  it("takvimde olmayan gün reddedilir (31.02.2026)", () => {
    expect(parseDateDots("31.02.2026")).toBe("");
  });

  it("13. ay reddedilir", () => {
    expect(parseDateDots("01.13.2026")).toBe("");
  });

  it("0. gün reddedilir", () => {
    expect(parseDateDots("00.07.2026")).toBe("");
  });

  it("artık yıl 29.02.2028 kabul edilir", () => {
    expect(parseDateDots("29.02.2028")).toBe("2028-02-29");
  });

  it("artık OLMAYAN yılda 29.02.2027 reddedilir", () => {
    expect(parseDateDots("29.02.2027")).toBe("");
  });

  it("ISO girdisi TR sanılmaz — BOŞ döner", () => {
    // `2026-07-19` yanlışlıkla geçirilirse sessizce kabul edilmemeli.
    expect(parseDateDots("2026-07-19")).toBe("");
  });

  it("tek haneli gün/ay reddedilir (biçim sıkı)", () => {
    expect(parseDateDots("1.7.2026")).toBe("");
  });
});
