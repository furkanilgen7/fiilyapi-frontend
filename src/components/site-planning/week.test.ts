import { describe, it, expect } from "vitest";

import {
  addDaysIso,
  currentWeekStart,
  formatWeekRange,
  isIsoDate,
  mondayOf,
  resolveWeekStart,
  weekDates,
  weekDayLabel,
  weekEndOf,
} from "./week";

// F-PL T2 · hafta aritmetiğinin SAF testleri. Ay/yıl sınırı ve artık yıl
// açıkça kapsanır — `Date` aritmetiğinin sessizce kaydığı yerler bunlardır.

describe("isIsoDate", () => {
  it("gecerli YYYY-MM-DD kabul eder", () => {
    expect(isIsoDate("2026-08-03")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true); // artık yıl
  });

  it("bicimi ya da takvimi bozuk degeri reddeder", () => {
    for (const value of ["", "2026-8-3", "03.08.2026", "2026-02-30", "2025-02-29", "abc"]) {
      expect(isIsoDate(value), value).toBe(false);
    }
  });
});

describe("addDaysIso", () => {
  it("hafta icinde ilerler", () => {
    expect(addDaysIso("2026-08-03", 6)).toBe("2026-08-09");
  });

  it("ay sinirini asar", () => {
    expect(addDaysIso("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysIso("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("yil sinirini asar", () => {
    expect(addDaysIso("2025-12-29", 7)).toBe("2026-01-05");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("artik yil 29 Subat'i atlamaz", () => {
    expect(addDaysIso("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysIso("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDaysIso("2025-02-28", 1)).toBe("2025-03-01");
  });
});

describe("mondayOf", () => {
  it("Pazartesi kendisidir", () => {
    expect(mondayOf("2026-08-03")).toBe("2026-08-03");
  });

  it("hafta ici gun kendi Pazartesi'sine dusr", () => {
    expect(mondayOf("2026-08-06")).toBe("2026-08-03");
  });

  it("PAZAR biten haftanin son gunudur (6 gun geri)", () => {
    expect(mondayOf("2026-08-09")).toBe("2026-08-03");
  });

  it("ay/yil sinirinda onceki aya/yila gecebilir", () => {
    expect(mondayOf("2026-09-02")).toBe("2026-08-31");
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
  });
});

describe("currentWeekStart / resolveWeekStart", () => {
  it("verilen anin haftasinin Pazartesi'sini dondurur", () => {
    // 2026-08-06 Perşembe (yerel saatle kurulur — üretim koduyla aynı yol).
    expect(currentWeekStart(new Date(2026, 7, 6, 23, 30))).toBe("2026-08-03");
  });

  it("parametre yoksa ya da bozuksa bu haftaya duser", () => {
    const now = new Date(2026, 7, 6);
    expect(resolveWeekStart(null, now)).toBe("2026-08-03");
    expect(resolveWeekStart("2026-02-30", now)).toBe("2026-08-03");
    expect(resolveWeekStart("bugün", now)).toBe("2026-08-03");
  });

  it("Pazartesi olmayan gecerli gunu haftasina yuvarlar", () => {
    expect(resolveWeekStart("2026-08-07", new Date(2026, 0, 1))).toBe("2026-08-03");
  });
});

describe("weekEndOf", () => {
  it("Pazartesi + 6 = Pazar", () => {
    expect(weekEndOf("2026-08-03")).toBe("2026-08-09");
    expect(weekEndOf("2026-12-28")).toBe("2027-01-03");
  });
});

// F-PL T4 · `weekDates` hücre gövdesinin KAPSAM SÜZGECİdir: buradan çıkan
// kümede olmayan tarih gövdeye girerse backend 422 verir. Bu yüzden ay/yıl
// sınırında da tam yedi ARDIŞIK gün üretmesi sözleşmenin parçasıdır.
describe("weekDates", () => {
  it("Pazartesi'den Pazar'a yedi ardisik gun uretir", () => {
    expect(weekDates("2026-08-03")).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("ay sinirinda da yedi gun uretir (kapsam daralmaz)", () => {
    expect(weekDates("2026-08-31")).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });

  it("yil sinirinda da yedi gun uretir", () => {
    expect(weekDates("2025-12-29")).toEqual([
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
  });

  it("son gunu weekEndOf ile AYNIdir (iki turev ayrismaz)", () => {
    for (const week of ["2026-08-03", "2026-08-31", "2025-12-29", "2024-02-26"]) {
      const days = weekDates(week);
      expect(days[6], week).toBe(weekEndOf(week));
    }
  });
});

describe("weekDayLabel", () => {
  it("gun kisaltmasi + kisa ay uretir (P111 bicimi)", () => {
    expect(weekDayLabel("2026-08-03")).toEqual({ weekday: "Pzt", dayMonth: "3 Ağu" });
    expect(weekDayLabel("2026-08-09")).toEqual({ weekday: "Paz", dayMonth: "9 Ağu" });
    expect(weekDayLabel("2026-07-21")).toEqual({ weekday: "Sal", dayMonth: "21 Tem" });
  });
});

describe("formatWeekRange", () => {
  it("ay ici haftada ay adi BIR KEZ yazilir (P105 bicimi)", () => {
    expect(formatWeekRange("2026-08-03", "2026-08-09")).toBe("3 – 9 Ağustos 2026");
  });

  it("ay sinirindaki haftada iki ay adi yazilir", () => {
    expect(formatWeekRange("2026-08-31", "2026-09-06")).toBe("31 Ağustos – 6 Eylül 2026");
  });

  it("yil sinirindaki haftada iki yil da yazilir", () => {
    expect(formatWeekRange("2025-12-29", "2026-01-04")).toBe("29 Aralık 2025 – 4 Ocak 2026");
  });
});
