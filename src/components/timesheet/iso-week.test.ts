import { describe, expect, it } from "vitest";

import {
  currentIsoWeek,
  isoWeekOf,
  mondayOfIsoWeek,
  parseIsoWeek,
  shiftIsoWeek,
  TIMESHEET_ISO_WEEK_MAX,
} from "./iso-week";

describe("isoWeekOf", () => {
  it("mockup'ın 13 Temmuz 2026 Pazartesi'sini 2026 · 29. hafta okur", () => {
    expect(isoWeekOf("2026-07-13")).toEqual({ isoYear: 2026, isoWeek: 29 });
  });

  it("haftanın Pazar'ı da AYNI ISO haftasına düşer (Pazar hafta SONUdur)", () => {
    expect(isoWeekOf("2026-07-19")).toEqual({ isoYear: 2026, isoWeek: 29 });
  });

  it("yıl sınırında ISO YILI takvim yılından AYRILIR: 1 Ocak 2027 → 2026 · 53. hafta", () => {
    expect(isoWeekOf("2027-01-01")).toEqual({ isoYear: 2026, isoWeek: 53 });
  });

  it("31 Aralık 2024 → 2025 · 1. hafta (ters yön)", () => {
    expect(isoWeekOf("2024-12-31")).toEqual({ isoYear: 2025, isoWeek: 1 });
  });
});

describe("mondayOfIsoWeek", () => {
  it("2026 · 29 → 13 Temmuz 2026", () => {
    expect(mondayOfIsoWeek(2026, 29)).toBe("2026-07-13");
  });

  it("her ISO yılının 1. haftası 4 Ocak'ı İÇERİR (kanon)", () => {
    for (const year of [2020, 2021, 2024, 2026, 2027]) {
      const monday = mondayOfIsoWeek(year, 1);
      expect(isoWeekOf(monday)).toEqual({ isoYear: year, isoWeek: 1 });
      expect(monday <= `${year}-01-04`).toBe(true);
    }
  });

  it("53. haftası OLMAYAN yılda sonuç BAŞKA ISO yılına taşar (çağıran doğrular)", () => {
    // 2025'in 52 haftası vardır; 53 istemek 2026'nın 1. haftasına taşar.
    expect(isoWeekOf(mondayOfIsoWeek(2025, 53))).toEqual({ isoYear: 2026, isoWeek: 1 });
  });
});

describe("shiftIsoWeek", () => {
  it("‹/› haftayı kaydırır", () => {
    expect(shiftIsoWeek({ isoYear: 2026, isoWeek: 29 }, 1)).toEqual({ isoYear: 2026, isoWeek: 30 });
    expect(shiftIsoWeek({ isoYear: 2026, isoWeek: 29 }, -1)).toEqual({ isoYear: 2026, isoWeek: 28 });
  });

  it("ISO YIL sınırını doğru geçer (53 → 1, yıl artar)", () => {
    expect(shiftIsoWeek({ isoYear: 2026, isoWeek: 53 }, 1)).toEqual({ isoYear: 2027, isoWeek: 1 });
    expect(shiftIsoWeek({ isoYear: 2026, isoWeek: 1 }, -1)).toEqual({ isoYear: 2025, isoWeek: 52 });
  });
});

describe("parseIsoWeek", () => {
  const now = new Date("2026-08-12T09:00:00Z");

  it("geçerli parametreyi okur", () => {
    expect(parseIsoWeek("2026", "29", now)).toEqual({ isoYear: 2026, isoWeek: 29 });
  });

  it("eksik/bozuk parametre İÇİNDE BULUNULAN haftaya düşer — kırık bağlantı boş ekran üretmez", () => {
    expect(parseIsoWeek(null, null, now)).toEqual(currentIsoWeek(now));
    expect(parseIsoWeek("abc", "29", now)).toEqual(currentIsoWeek(now));
    expect(parseIsoWeek("2026", "0", now)).toEqual(currentIsoWeek(now));
    expect(parseIsoWeek("2026", String(TIMESHEET_ISO_WEEK_MAX + 1), now)).toEqual(
      currentIsoWeek(now),
    );
  });

  it("uç sözleşmesinin yıl aralığı (2000..2100) DIŞI da bugüne düşer", () => {
    expect(parseIsoWeek("1999", "5", now)).toEqual(currentIsoWeek(now));
    expect(parseIsoWeek("2101", "5", now)).toEqual(currentIsoWeek(now));
  });

  it("🔴 o yılda VAR OLMAYAN 53. hafta bugüne düşer — uydurma hafta açılmaz", () => {
    // 2025'in 52 haftası vardır. Doğrulanmazsa ekran 2026-W1'i "2025-W53"
    // diye açar ve kullanıcı yanlış haftayı kaydeder.
    expect(parseIsoWeek("2025", "53", now)).toEqual(currentIsoWeek(now));
    // 2026'nın 53 haftası VARDIR — bu sınır testinin pozitif kontrolü.
    expect(parseIsoWeek("2026", "53", now)).toEqual({ isoYear: 2026, isoWeek: 53 });
  });
});

describe("currentIsoWeek", () => {
  it("bugünün ISO haftasıdır", () => {
    expect(currentIsoWeek(new Date("2026-07-15T10:00:00"))).toEqual({
      isoYear: 2026,
      isoWeek: 29,
    });
  });
});
