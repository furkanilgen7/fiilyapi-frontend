import { describe, expect, it } from "vitest";

import { BackendError } from "@/lib/api/unwrap";

import {
  discardLockedDraft,
  formatLockedDayList,
  lockBannerHeadline,
  lockBannerText,
  lockConflictText,
  lockedCopyNotice,
  lockNoteText,
  lockTitleText,
  mergeDayLocks,
  parseLockedDays,
  toDayLocks,
  type TimesheetDayLock,
} from "./timesheet-lock";
import {
  timesheetLockConflictLocks,
  timesheetSaveErrorMessage,
} from "./timesheet-errors";
import { timesheetDraftKey } from "./timesheet-draft";

/**
 * PLN-F2.4 · Puantajda KİLİTLİ GÜN (rapor onayı) — saf katman.
 *
 * Kadraj haftası mockup'ın haftasıdır: 2026-W39 = Pzt 21 – Paz 27 Eylül 2026.
 */
const MON = "2026-09-21";
const TUE = "2026-09-22";
const WED = "2026-09-23";
const THU = "2026-09-24";
const FRI = "2026-09-25";
const SAT = "2026-09-26";
const SUN = "2026-09-27";
const WEEK = [MON, TUE, WED, THU, FRI, SAT, SUN];

function unknownLocks(days: string[]): TimesheetDayLock[] {
  return days.map((day) => ({ day, reportDate: null }));
}

describe("formatLockedDayList — gün aralığı / gün listesi", () => {
  it("ARDIŞIK günler aralık olur, ay yalnız sonda", () => {
    expect(formatLockedDayList([MON, TUE, WED, THU])).toBe(
      "Pzt 21 – Per 24 Eyl",
    );
  });

  it("ARDIŞIK OLMAYAN günler aralık değil GÜN LİSTESİ olur", () => {
    expect(formatLockedDayList([MON, WED, THU])).toBe(
      "Pzt 21, Çar 23, Per 24 Eyl",
    );
  });

  it("tek gün yalnız kendisidir", () => {
    expect(formatLockedDayList([THU])).toBe("Per 24 Eyl");
  });

  it("sıra ve tekrar girdiden bağımsızdır", () => {
    expect(formatLockedDayList([THU, MON, WED, TUE, MON])).toBe(
      "Pzt 21 – Per 24 Eyl",
    );
  });

  it("ay sınırını aşan aralıkta her uç kendi ayını taşır", () => {
    expect(
      formatLockedDayList([
        "2026-09-28",
        "2026-09-29",
        "2026-09-30",
        "2026-10-01",
      ]),
    ).toBe("Pzt 28 Eyl – Per 1 Eki");
  });
});

describe("lockBannerText — üç rapor dalı × ardışık/ardışık olmayan", () => {
  const HINT =
    ' Bu günlerin hücreleri salt okunur · değişiklik için günlük kaydında "Kilidi aç (yetkili)".';

  it("rapor tarihi BİLİNMİYORSA (bugünkü dal) → 'rapor onayıyla kilitli'", () => {
    expect(lockBannerText(unknownLocks([MON, TUE, WED, THU]))).toBe(
      `Pzt 21 – Per 24 Eyl rapor onayıyla kilitli.${HINT}`,
    );
  });

  it("TEK rapor tarihi → '{tarih} raporuyla kilitli' (mockup metni)", () => {
    const locks = [MON, TUE, WED, THU].map((day) => ({
      day,
      reportDate: "2026-09-25",
    }));
    expect(lockBannerText(locks)).toBe(
      `Pzt 21 – Per 24 Eyl 25.09.2026 raporuyla kilitli.${HINT}`,
    );
  });

  it("BİRDEN ÇOK rapor tarihi → 'rapor onaylarıyla kilitli'", () => {
    const locks = [
      { day: MON, reportDate: "2026-09-22" },
      { day: TUE, reportDate: "2026-09-25" },
    ];
    expect(lockBannerText(locks)).toBe(
      `Pzt 21 – Sal 22 Eyl rapor onaylarıyla kilitli.${HINT}`,
    );
  });

  it("bilinen ve bilinmeyen tarih karışıksa tek tarih UYDURULMAZ → çoğul dal", () => {
    const locks = [
      { day: MON, reportDate: "2026-09-25" },
      { day: TUE, reportDate: null },
    ];
    expect(lockBannerHeadline(locks)).toBe(
      "Pzt 21 – Sal 22 Eyl rapor onaylarıyla kilitli.",
    );
  });

  it("ardışık OLMAYAN günlerde başlık gün listesini taşır", () => {
    expect(lockBannerHeadline(unknownLocks([MON, WED, THU]))).toBe(
      "Pzt 21, Çar 23, Per 24 Eyl rapor onayıyla kilitli.",
    );
  });
});

describe("lockNoteText / lockTitleText — tek gün", () => {
  it("tarih yoksa 'rapor onayı'", () => {
    expect(lockNoteText(null)).toBe("Bu gün kilitli · rapor onayı");
    expect(lockTitleText(null)).toBe("Kilitli · rapor onayı");
  });

  it("tarih varsa '{dd.mm.yyyy} raporu' (mockup)", () => {
    expect(lockNoteText("2026-09-25")).toBe(
      "Bu gün kilitli · 25.09.2026 raporu",
    );
    expect(lockTitleText("2026-09-25")).toBe("Kilitli · 25.09.2026 raporu");
  });
});

describe("parseLockedDays — 409 gövdesi DIŞ VERİDİR", () => {
  it("geçerli ISO tarih dizisi kabul edilir", () => {
    expect(parseLockedDays([THU, MON])).toEqual([MON, THU]);
  });

  it.each([
    ["dizi değil", "2026-09-24"],
    ["boş dizi", []],
    ["tarih olmayan öğe", ["2026-09-24", 7]],
    ["biçimsiz dize", ["24.09.2026"]],
    ["takvimde olmayan gün", ["2026-02-30"]],
    ["null", null],
  ])("%s → null", (_label, value) => {
    expect(parseLockedDays(value)).toBeNull();
  });
});

describe("toDayLocks — TEK dönüştürücü ({locked_days, day_locks?})", () => {
  it("bugün (day_locks YOK): her gün reportDate null, tekrarsız ve sıralı", () => {
    expect(toDayLocks({ locked_days: [THU, MON, THU] })).toEqual([
      { day: MON, reportDate: null },
      { day: THU, reportDate: null },
    ]);
  });

  it("yanıtta alan yoksa kilit de yok", () => {
    expect(toDayLocks({})).toEqual([]);
  });

  it("biçimsiz locked_days öğesi ATILIR (hafta yanıtında sessizce), geçerliler kalır", () => {
    expect(toDayLocks({ locked_days: [MON, "dün"] })).toEqual([
      { day: MON, reportDate: null },
    ]);
  });

  it("day_locks'ta rapor tarihi olan gün o tarihi alır; yalnız locked_days'te olan null kalır", () => {
    expect(
      toDayLocks({
        locked_days: [MON, TUE],
        day_locks: [{ day: MON, report_date: "2026-09-25" }],
      }),
    ).toEqual([
      { day: MON, reportDate: "2026-09-25" },
      { day: TUE, reportDate: null },
    ]);
  });

  it("bozuk day_locks öğesi ATILIR; locked_days yine esastır (listede olmayan gün kilit sayılmaz)", () => {
    expect(
      toDayLocks({
        locked_days: [MON, TUE],
        day_locks: [
          { day: MON, report_date: "25.09.2026" },
          { day: TUE },
          "2026-09-22",
          null,
          { day: WED, report_date: "2026-09-25" },
        ],
      }),
    ).toEqual([
      { day: MON, reportDate: null },
      { day: TUE, reportDate: null },
    ]);
  });

  it("day_locks dizi değilse yok sayılır", () => {
    expect(toDayLocks({ locked_days: [MON], day_locks: "x" })).toEqual([
      { day: MON, reportDate: null },
    ]);
  });
});

describe("EV-BORC-4 backend örneği — dallar kilitlenir (gün adları gerçek takvimden)", () => {
  // 04.05 → rapor 04.05 · 05.05 AÇIK · 06.05 → rapor 07.05 · 07.05 → rapor 07.05
  const locks = toDayLocks({
    locked_days: ["2026-05-04", "2026-05-06", "2026-05-07"],
    day_locks: [
      { day: "2026-05-04", report_date: "2026-05-04" },
      { day: "2026-05-06", report_date: "2026-05-07" },
      { day: "2026-05-07", report_date: "2026-05-07" },
    ],
  });

  it("ardışık değil + iki rapor → gün listesi + 'rapor onaylarıyla'", () => {
    expect(lockBannerHeadline(locks)).toBe(
      "Pzt 4, Çar 6, Per 7 May rapor onaylarıyla kilitli.",
    );
  });

  it("popover 06.05 → 'Bu gün kilitli · 07.05.2026 raporu'", () => {
    const wednesday = locks.find((lock) => lock.day === "2026-05-06");
    expect(lockNoteText(wednesday?.reportDate ?? null)).toBe(
      "Bu gün kilitli · 07.05.2026 raporu",
    );
  });

  it("yalnız 06–07.05 (tek rapor, ardışık) → aralık + '07.05.2026 raporuyla'", () => {
    expect(lockBannerHeadline(locks.slice(1))).toBe(
      "Çar 6 – Per 7 May 07.05.2026 raporuyla kilitli.",
    );
  });
});

describe("mergeDayLocks — sunucu ∪ 409", () => {
  it("birleşim tekrarsızdır ve bilinen rapor tarihi bilinmeyene üstün gelir", () => {
    expect(
      mergeDayLocks(
        [{ day: MON, reportDate: null }],
        [
          { day: MON, reportDate: "2026-09-25" },
          { day: THU, reportDate: null },
        ],
      ),
    ).toEqual([
      { day: MON, reportDate: "2026-09-25" },
      { day: THU, reportDate: null },
    ]);
  });
});

describe("timesheetLockConflictLocks / timesheetSaveErrorMessage — iki ayrı 409", () => {
  it("locked_days taşıyan 409 KİLİT 409'udur", () => {
    const error = new BackendError(409, {
      detail: "Gün kilitli",
      locked_days: [THU],
    });
    expect(timesheetLockConflictLocks(error)).toEqual([
      { day: THU, reportDate: null },
    ]);
  });

  it("409 gövdesindeki day_locks rapor tarihini taşır; bozuk öğe atılır", () => {
    const error = new BackendError(409, {
      detail: "Gün kilitli",
      locked_days: [WED, THU],
      day_locks: [{ day: THU, report_date: "2026-09-25" }, { day: WED }],
    });
    expect(timesheetLockConflictLocks(error)).toEqual([
      { day: WED, reportDate: null },
      { day: THU, reportDate: "2026-09-25" },
    ]);
  });

  it("locked_days taşımayan 409 kişi-gün çakışmasıdır — kilit SAYILMAZ, mesaj aynen kalır", () => {
    const error = new BackendError(409, {
      detail: "Mehmet Kılıç 3 Ağustos günü B-Blok'ta.",
    });
    expect(timesheetLockConflictLocks(error)).toBeNull();
    expect(timesheetSaveErrorMessage(error)).toBe(
      "Kişi-gün çakışması: Mehmet Kılıç 3 Ağustos günü B-Blok'ta.",
    );
  });

  it("locked_days bozuksa kilit 409'u SAYILMAZ", () => {
    const error = new BackendError(409, {
      detail: "x",
      locked_days: ["yarın"],
    });
    expect(timesheetLockConflictLocks(error)).toBeNull();
  });

  it("409 olmayan hata kilit değildir", () => {
    expect(
      timesheetLockConflictLocks(new BackendError(422, { locked_days: [THU] })),
    ).toBeNull();
    expect(timesheetLockConflictLocks(new Error("ağ"))).toBeNull();
  });

  it("kilit 409'unun metni 'Kişi-gün çakışması' DEĞİLDİR", () => {
    const error = new BackendError(409, {
      detail: "Gün kilitli",
      locked_days: [THU],
    });
    expect(timesheetSaveErrorMessage(error)).not.toMatch(/Kişi-gün/);
  });
});

describe("discardLockedDraft — P4: kilitli günün taslağı ATILIR, kilitsizin taslağı KORUNUR", () => {
  const draft = {
    [timesheetDraftKey("p-1", THU)]: {
      hours: "10",
      code: null,
      sectionId: null,
    },
    [timesheetDraftKey("p-1", FRI)]: {
      hours: "10",
      code: null,
      sectionId: null,
    },
    [timesheetDraftKey("p-2", THU)]: null,
  };

  it("kilitli günlerin anahtarları düşer, diğerleri AYNEN kalır", () => {
    const result = discardLockedDraft(draft, new Set([MON, TUE, WED, THU]));
    expect(result.draft).toEqual({
      [timesheetDraftKey("p-1", FRI)]: {
        hours: "10",
        code: null,
        sectionId: null,
      },
    });
    expect(result.discardedDays).toEqual([THU]);
  });

  it("kilitli günde taslak yoksa hiçbir şey atılmaz", () => {
    const result = discardLockedDraft(draft, new Set([MON]));
    expect(result.draft).toEqual(draft);
    expect(result.discardedDays).toEqual([]);
  });
});

describe("lockConflictText — mockup (e) hata bandı", () => {
  it("tek gün, rapor tarihi bilinmiyor", () => {
    expect(lockConflictText(unknownLocks([THU]))).toEqual({
      title: "Bu gün kilitlendi; değişiklik kaydedilmedi.",
      body: "Per 24 Eyl, siz düzenlerken rapor onayıyla kilitlendi (409) · kilitli güne yapılan değişiklik geri alındı; diğer günler kaydedilmeye hazır.",
    });
  });

  it("tek gün, rapor tarihi biliniyor (mockup metni)", () => {
    expect(
      lockConflictText([{ day: THU, reportDate: "2026-09-25" }]).body,
    ).toBe(
      "Per 24 Eyl, siz düzenlerken 25.09.2026 raporuyla kilitlendi (409) · kilitli güne yapılan değişiklik geri alındı; diğer günler kaydedilmeye hazır.",
    );
  });

  it("birden çok gün çoğul başlık alır", () => {
    expect(lockConflictText(unknownLocks([WED, THU])).title).toBe(
      "Bu günler kilitlendi; değişiklik kaydedilmedi.",
    );
  });
});

describe("lockedCopyNotice — mockup (b) bildirimi", () => {
  it("kilitli günler atlanır, kilitsiz aralık önceki haftadan dolar", () => {
    expect(
      lockedCopyNotice({
        lockedDays: [MON, TUE, WED, THU],
        weekDays: WEEK,
        sourceIsoWeek: 38,
      }),
    ).toBe(
      "Kopyalandı · kilitli 4 gün atlandı (Pzt 21 – Per 24 Eyl). Cum–Paz 38. Hafta'dan dolduruldu.",
    );
  });

  it("kilitsiz günler ardışık değilse gün adları listelenir", () => {
    expect(
      lockedCopyNotice({
        lockedDays: [TUE, THU],
        weekDays: WEEK,
        sourceIsoWeek: 38,
      }),
    ).toBe(
      "Kopyalandı · kilitli 2 gün atlandı (Sal 22, Per 24 Eyl). Pzt, Çar, Cum, Cmt, Paz 38. Hafta'dan dolduruldu.",
    );
  });

  it("hafta dışındaki kilit günü sayılmaz", () => {
    expect(
      lockedCopyNotice({
        lockedDays: ["2026-09-18", SUN],
        weekDays: WEEK,
        sourceIsoWeek: 38,
      }),
    ).toBe(
      "Kopyalandı · kilitli 1 gün atlandı (Paz 27 Eyl). Pzt–Cmt 38. Hafta'dan dolduruldu.",
    );
  });

  it("haftada kilit yoksa kilit bildirimi yoktur", () => {
    expect(
      lockedCopyNotice({ lockedDays: [], weekDays: WEEK, sourceIsoWeek: 38 }),
    ).toBeNull();
  });
});
