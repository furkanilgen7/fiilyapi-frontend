import { afterEach, describe, it, expect } from "vitest";

import { formatDiaryDayLabel, isoDate, isoPeriod, isValidIsoDate, parseDiaryDateParam, shiftPeriod } from "./derive";

// F-SD T4 · ay gezinmesi (HÖ90/92). `Date` aritmetiği kullanılmadığı için
// yıl taşmaları elle doğrulanır.
describe("shiftPeriod", () => {
  it("ay ileri/geri kaydırır", () => {
    expect(shiftPeriod({ year: 2026, month: 7 }, 1)).toEqual({ year: 2026, month: 8 });
    expect(shiftPeriod({ year: 2026, month: 7 }, -1)).toEqual({ year: 2026, month: 6 });
  });

  it("Aralık→Ocak ve Ocak→Aralık taşmasını yürütür", () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("bir yıldan uzun kaydırmayı da doğru yürütür", () => {
    expect(shiftPeriod({ year: 2026, month: 3 }, 14)).toEqual({ year: 2027, month: 5 });
    expect(shiftPeriod({ year: 2026, month: 3 }, -14)).toEqual({ year: 2025, month: 1 });
  });

  it("`isoPeriod` çıktısıyla birlikte çalışır", () => {
    expect(shiftPeriod(isoPeriod("2026-01-15"), -1)).toEqual({ year: 2025, month: 12 });
  });
});

// PLN-F3.0 · `?tarih=` doğrulama/okuma.
describe("isValidIsoDate", () => {
  it("gerçek takvim günleri → true", () => {
    expect(isValidIsoDate("2026-09-24")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true); // artık yıl
  });

  it("biçim doğru ama takvimde YOK → false (Date sessiz taşmayı yakalar)", () => {
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2023-02-29")).toBe(false); // artık yıl DEĞİL
  });

  it("biçim yanlış → false", () => {
    expect(isValidIsoDate("24-09-2026")).toBe(false);
    expect(isValidIsoDate("2026-9-24")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
    expect(isValidIsoDate("abc")).toBe(false);
  });
});

describe("parseDiaryDateParam", () => {
  it("geçerli ISO → aynen", () => {
    expect(parseDiaryDateParam("2026-09-24")).toBe("2026-09-24");
  });

  it("null / geçersiz / takvimde yok → BUGÜN", () => {
    const today = isoDate(new Date());
    expect(parseDiaryDateParam(null)).toBe(today);
    expect(parseDiaryDateParam("2026-02-30")).toBe(today);
    expect(parseDiaryDateParam("değil bir tarih")).toBe(today);
  });
});

// PLN-F2.5e · karar 1 — başlık alt satırı "24.09.2026 Perşembe" (İ:113).
describe("formatDiaryDayLabel", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("ISO günü 'gg.aa.yyyy Gün adı' olarak basar (İ:113)", () => {
    expect(formatDiaryDayLabel("2026-09-24")).toBe("24.09.2026 Perşembe");
    expect(formatDiaryDayLabel("2026-09-27")).toBe("27.09.2026 Pazar");
    expect(formatDiaryDayLabel("2026-09-28")).toBe("28.09.2026 Pazartesi");
  });

  it("yıl/ay sınırında gün adı kaymaz", () => {
    expect(formatDiaryDayLabel("2026-12-31")).toBe("31.12.2026 Perşembe");
    expect(formatDiaryDayLabel("2027-01-01")).toBe("01.01.2027 Cuma");
    expect(formatDiaryDayLabel("2026-03-01")).toBe("01.03.2026 Pazar");
  });

  // Gün adı ISO günden hesaplanır; yerel saat dilimi (UTC'nin doğusu/batısı)
  // onu bir gün kaydıramaz — `new Date(iso)` (UTC) ya da yerel gece yarısı +
  // `getUTCDay()` karışımı burada kırmızı olur.
  it.each(["Europe/Istanbul", "America/Los_Angeles", "Pacific/Kiritimati", "UTC"])(
    "saat dilimi %s iken de aynı gün adı",
    (zone) => {
      process.env.TZ = zone;
      expect(formatDiaryDayLabel("2026-09-24")).toBe("24.09.2026 Perşembe");
      expect(formatDiaryDayLabel("2027-01-01")).toBe("01.01.2027 Cuma");
    },
  );

  it("ayrıştırılamayan girdi olduğu gibi döner", () => {
    expect(formatDiaryDayLabel("bozuk")).toBe("bozuk");
  });
});
