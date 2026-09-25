import { describe, expect, it } from "vitest";

import type { EvSettingsRead } from "@/lib/api/models";

import {
  buildSavePayload,
  changedSections,
  draftFromSettings,
  formatDecimalInput,
  formatHolidayDates,
  holidayOffDayNote,
  pfBandSettingsFromDraft,
  parseDecimalInput,
  parseHolidayDates,
  validateDraft,
  weekRangeLabel,
  type SettingsDraft,
} from "./settings-form";

const READ: EvSettingsRead = {
  week_start_dow: 0,
  weekly_off_days: [6],
  standard_daily_hours: "9.00",
  tolerance_points: "2.00",
  pf_bands: {
    daily: { red_below: "0.950", green_from: "0.950", high_above: "1.050" },
    weekly: { red_below: "0.950", green_from: "1.000" },
  },
  holidays: [
    { id: "h-1", date_from: "2026-05-26", date_to: "2026-05-30", note: "Kurban Bayramı" },
    { id: "h-2", date_from: "2026-08-30", date_to: "2026-08-30", note: "Zafer Bayramı" },
  ],
  composite_metrics: [
    {
      id: "m-1",
      name: "1 m³ beton başına toplam betonarme a-s",
      measure: "spent",
      numerator_item_ids: ["i-1", "i-2"],
      denominator_item_id: "i-2",
    },
  ],
  is_default: false,
  updated_at: "2026-09-24T10:00:00Z",
  updated_by: null,
};

function draft(): SettingsDraft {
  return draftFromSettings(READ);
}

describe("formatDecimalInput / parseDecimalInput", () => {
  it("backend ölçeğini ekran metnine çevirir (sondaki sıfır min basamağa kadar atılır)", () => {
    expect(formatDecimalInput("9.00", 0, 2)).toBe("9");
    expect(formatDecimalInput("8.50", 0, 2)).toBe("8,5");
    expect(formatDecimalInput("2.00", 1, 2)).toBe("2,0");
    expect(formatDecimalInput("0.950", 2, 3)).toBe("0,95");
    expect(formatDecimalInput("0.955", 2, 3)).toBe("0,955");
    expect(formatDecimalInput("1", 2, 3)).toBe("1,00");
  });

  it("virgül ya da noktalı girdiyi kayıpsız ondalık dizeye çevirir, kalıp dışını reddeder", () => {
    expect(parseDecimalInput("0,95", 2, 3)).toBe("0.95");
    expect(parseDecimalInput(" 1.05 ", 2, 3)).toBe("1.05");
    expect(parseDecimalInput("9", 2, 2)).toBe("9");
    expect(parseDecimalInput("", 2, 3)).toBeNull();
    expect(parseDecimalInput("abc", 2, 3)).toBeNull();
    expect(parseDecimalInput("-1", 2, 3)).toBeNull();
    expect(parseDecimalInput("0,9555", 2, 3)).toBeNull();
    expect(parseDecimalInput("123", 2, 3)).toBeNull();
  });
});

describe("tatil tarihi metni", () => {
  it("tek gün ve aralığı ayrıştırır (Ek:144 GG.AA.YYYY · Ek:416 aralık metni)", () => {
    expect(parseHolidayDates("15.07.2026")).toEqual({ from: "2026-07-15", to: "2026-07-15" });
    expect(parseHolidayDates("26.05.2026 – 30.05.2026")).toEqual({
      from: "2026-05-26",
      to: "2026-05-30",
    });
    expect(parseHolidayDates("26.05.2026-30.05.2026")).toEqual({
      from: "2026-05-26",
      to: "2026-05-30",
    });
    expect(parseHolidayDates("31.02.2026")).toBeNull();
    expect(parseHolidayDates("2026-07-15")).toBeNull();
  });

  it("tek günü tek tarih, aralığı en tireyle basar", () => {
    expect(formatHolidayDates("2026-07-15", "2026-07-15")).toBe("15.07.2026");
    expect(formatHolidayDates("2026-05-26", "2026-05-30")).toBe("26.05.2026 – 30.05.2026");
  });

  it("tek günlük tatil çalışılmayan güne düşerse notu verir (Ek:457), aralıkta vermez", () => {
    // 30.08.2026 Pazar; 6 = Pazar.
    expect(holidayOffDayNote("30.08.2026", [6])).toBe("Paz'a denk");
    expect(holidayOffDayNote("30.08.2026", [5])).toBe("");
    expect(holidayOffDayNote("29.08.2026 – 30.08.2026", [6])).toBe("");
  });
});

describe("draftFromSettings", () => {
  it("SettingsRead'i form metnine çevirir; tatil ve metrik kimliğini taşımaz", () => {
    const d = draft();
    expect(d.weekStartDow).toBe(0);
    expect(d.weeklyOffDays).toEqual([6]);
    expect(d.standardDailyHours).toBe("9");
    expect(d.tolerancePoints).toBe("2,0");
    expect(d.bands.daily).toEqual({ redBelow: "0,95", greenFrom: "0,95", highAbove: "1,05" });
    expect(d.bands.weekly).toEqual({ redBelow: "0,95", greenFrom: "1,00" });
    expect(d.holidays.map((h) => [h.dates, h.note])).toEqual([
      ["26.05.2026 – 30.05.2026", "Kurban Bayramı"],
      ["30.08.2026", "Zafer Bayramı"],
    ]);
    expect(d.metrics[0]).toMatchObject({
      name: "1 m³ beton başına toplam betonarme a-s",
      measure: "spent",
      numeratorItemIds: ["i-1", "i-2"],
      denominatorItemId: "i-2",
    });
  });
});

describe("validateDraft", () => {
  it("varsayılan taslak geçerlidir", () => {
    expect(validateDraft(draft()).hasErrors).toBe(false);
  });

  it("günlük standart saat 1–16 dışında hatalıdır (Ek:456)", () => {
    expect(validateDraft({ ...draft(), standardDailyHours: "0" }).standardDailyHours).toBe(true);
    expect(validateDraft({ ...draft(), standardDailyHours: "16" }).standardDailyHours).toBe(false);
    expect(validateDraft({ ...draft(), standardDailyHours: "16,5" }).standardDailyHours).toBe(true);
    expect(validateDraft({ ...draft(), standardDailyHours: "1" }).standardDailyHours).toBe(false);
  });

  it("tolerans boş ya da sayı değilse hatalıdır, 0 geçerlidir", () => {
    expect(validateDraft({ ...draft(), tolerancePoints: "" }).tolerancePoints).toBe(true);
    expect(validateDraft({ ...draft(), tolerancePoints: "0" }).tolerancePoints).toBe(false);
  });

  it("haftanın bütün günleri çalışılmayan olamaz (backend ALL_DAYS_OFF)", () => {
    const all = { ...draft(), weeklyOffDays: [0, 1, 2, 3, 4, 5, 6] };
    expect(validateDraft(all).weeklyOffDays).toBe(true);
    expect(validateDraft(all).hasErrors).toBe(true);
  });

  it("günlük bant sırası: yeşil < kırmızı → err1; şüpheli yüksek < yeşil → err2 (Ek:430)", () => {
    const d = draft();
    const greenBelowRed = validateDraft({
      ...d,
      bands: { ...d.bands, daily: { redBelow: "0,95", greenFrom: "0,90", highAbove: "1,05" } },
    });
    expect(greenBelowRed.daily.greenBelowRed).toBe(true);
    expect(greenBelowRed.hasErrors).toBe(true);

    const highBelowGreen = validateDraft({
      ...d,
      bands: { ...d.bands, daily: { redBelow: "0,95", greenFrom: "0,95", highAbove: "0,93" } },
    });
    expect(highBelowGreen.daily.highBelowGreen).toBe(true);

    // Eşitlik geçerlidir (backend: red ≤ green ≤ high).
    const equal = validateDraft({
      ...d,
      bands: { ...d.bands, daily: { redBelow: "0,95", greenFrom: "0,95", highAbove: "0,95" } },
    });
    expect(equal.hasErrors).toBe(false);
  });

  it("haftalık bantta yeşil kırmızıdan küçükse hatalıdır (AYP varyantı 0,90 / 0,95)", () => {
    const d = draft();
    const v = validateDraft({ ...d, bands: { ...d.bands, weekly: { redBelow: "0,95", greenFrom: "0,90" } } });
    expect(v.weekly.greenBelowRed).toBe(true);
    expect(v.hasErrors).toBe(true);
  });

  it("boş bant alanı hatalıdır ama sıra hatası sayılmaz", () => {
    const d = draft();
    const v = validateDraft({ ...d, bands: { ...d.bands, weekly: { redBelow: "", greenFrom: "1,00" } } });
    expect(v.weekly.redBelow).toBe(true);
    expect(v.weekly.greenBelowRed).toBe(false);
  });

  it("tatil: bozuk tarih, ters aralık ve çakışma satırı hatalıdır; tamamen boş satır hata değildir", () => {
    const d = draft();
    const v = validateDraft({
      ...d,
      holidays: [
        { key: "a", dates: "01.01.2027", note: "Yılbaşı" },
        { key: "b", dates: "35.01.2027", note: "Bozuk" },
        { key: "c", dates: "05.02.2027 – 01.02.2027", note: "Ters" },
        { key: "d", dates: "01.01.2027 – 02.01.2027", note: "Çakışan" },
        { key: "e", dates: "", note: "" },
        { key: "f", dates: "", note: "Tarihsiz" },
      ],
    });
    expect([...v.invalidHolidayKeys].sort()).toEqual(["a", "b", "c", "d", "f"]);
    expect(v.hasErrors).toBe(true);
  });
});

describe("pfBandSettingsFromDraft", () => {
  it("geçerli kutuyu pfBand() eşiklerine çevirir; YALNIZ o kutu hatalıysa null (Ek:434 kutu başına)", () => {
    expect(pfBandSettingsFromDraft(draft(), "daily")).toEqual({
      daily: { redBelow: "0.95", greenFrom: "0.95", highAbove: "1.05" },
      weekly: { redBelow: "0.95", greenFrom: "1.00" },
    });
    const d = draft();
    const badDaily: SettingsDraft = {
      ...d,
      bands: { ...d.bands, daily: { redBelow: "0,95", greenFrom: "0,95", highAbove: "0,93" } },
    };
    expect(pfBandSettingsFromDraft(badDaily, "daily")).toBeNull();
    expect(pfBandSettingsFromDraft(badDaily, "weekly")?.weekly).toEqual({
      redBelow: "0.95",
      greenFrom: "1.00",
    });
  });
});

describe("buildSavePayload", () => {
  it("tam değiştirme gövdesi kurar: noktalı ondalık, ISO tarih, tatil/metrikte id YOK", () => {
    const d = draft();
    const payload = buildSavePayload({
      ...d,
      weeklyOffDays: [6, 5],
      holidays: [...d.holidays, { key: "x", dates: "", note: "" }],
    });
    expect(payload).toEqual({
      week_start_dow: 0,
      weekly_off_days: [5, 6],
      standard_daily_hours: "9",
      tolerance_points: "2.0",
      pf_bands: {
        daily: { red_below: "0.95", green_from: "0.95", high_above: "1.05" },
        weekly: { red_below: "0.95", green_from: "1.00" },
      },
      holidays: [
        { date_from: "2026-05-26", date_to: "2026-05-30", note: "Kurban Bayramı" },
        { date_from: "2026-08-30", date_to: "2026-08-30", note: "Zafer Bayramı" },
      ],
      composite_metrics: [
        {
          name: "1 m³ beton başına toplam betonarme a-s",
          measure: "spent",
          numerator_item_ids: ["i-1", "i-2"],
          denominator_item_id: "i-2",
        },
      ],
    });
    for (const holiday of payload.holidays ?? []) expect(holiday).not.toHaveProperty("id");
    for (const metric of payload.composite_metrics ?? []) expect(metric).not.toHaveProperty("id");
  });
});

describe("changedSections", () => {
  it("değişen bölümleri mockup adlarıyla bir kez sayar (Ek:442)", () => {
    const base = draft();
    expect(changedSections(base, base)).toEqual([]);
    const next: SettingsDraft = {
      ...base,
      weekStartDow: 4,
      standardDailyHours: "8",
      bands: { ...base.bands, daily: { ...base.bands.daily, highAbove: "1,08" } },
    };
    expect(changedSections(base, next)).toEqual(["Takvim", "PF bantları"]);
  });

  it("çalışılmayan günlerin sırası değişiklik sayılmaz", () => {
    const base = { ...draft(), weeklyOffDays: [5, 6] };
    expect(changedSections(base, { ...base, weeklyOffDays: [6, 5] })).toEqual([]);
  });
});

describe("weekRangeLabel", () => {
  it("bugünü içeren haftayı seçilen başlangıç gününe göre verir (Ek:454)", () => {
    // 24.09.2026 Perşembe.
    const today = new Date(2026, 8, 24);
    expect(weekRangeLabel(today, 0)).toBe("21.09–27.09");
    expect(weekRangeLabel(today, 4)).toBe("18.09–24.09");
    expect(weekRangeLabel(today, 3)).toBe("24.09–30.09");
  });
});
