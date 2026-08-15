import { describe, it, expect } from "vitest";

import {
  currentPeriod,
  entryActions,
  hasCarriedBalance,
  journalStatusLabel,
  journalStatusVariant,
  netBalanceTone,
  shiftPeriod,
} from "./accounting-labels";

describe("currentPeriod — YEREL takvim", () => {
  it("yerel yil/ay doner (1 tabanli)", () => {
    // 17 Temmuz 2026, yerel öğle — hiçbir dilimde gün kaymaz.
    expect(currentPeriod(new Date(2026, 6, 17, 12, 0, 0))).toEqual({ year: 2026, month: 7 });
  });

  /**
   * 🔴 TB5 dersi: ayın İLK gününün yerel gece yarısı, UTC'de bir ÖNCEKİ ayın
   * son günüdür (TR = UTC+3). `toISOString()`/`getUTCMonth()` ile okunsaydı
   * bu kare Temmuz yerine Haziran'ı gösterirdi.
   */
  it("ayin ILK gununun yerel gece yarisinda ay GERI KAYMAZ", () => {
    const localMidnight = new Date(2026, 6, 1, 0, 0, 0);
    expect(currentPeriod(localMidnight)).toEqual({ year: 2026, month: 7 });
    // Kanıt: aynı an UTC'de Haziran'dır (pozitif ofsetli dilimlerde).
    if (localMidnight.getTimezoneOffset() < 0) {
      expect(localMidnight.getUTCMonth() + 1).toBe(6);
    }
  });

  it("ayin SON gununun yerel 23:59'unda ay ILERI KAYMAZ", () => {
    expect(currentPeriod(new Date(2026, 6, 31, 23, 59, 59))).toEqual({ year: 2026, month: 7 });
  });
});

describe("shiftPeriod", () => {
  it("ay ilerletir", () => {
    expect(shiftPeriod({ year: 2026, month: 7 }, 1)).toEqual({ year: 2026, month: 8 });
  });
  it("ay geriletir", () => {
    expect(shiftPeriod({ year: 2026, month: 7 }, -1)).toEqual({ year: 2026, month: 6 });
  });
  it("Aralik'tan ileri gidince YIL doner", () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });
  it("Ocak'tan geri gidince YIL doner", () => {
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
  it("cok aylik siçrama da dogru yili verir", () => {
    expect(shiftPeriod({ year: 2026, month: 3 }, -14)).toEqual({ year: 2025, month: 1 });
  });
});

describe("durum → etiket (yönetim kararı 1)", () => {
  it("uc durumun karsiligi BIREBIR", () => {
    expect(journalStatusLabel("draft")).toBe("Taslak");
    expect(journalStatusLabel("posted")).toBe("Kayıtlı");
    expect(journalStatusLabel("reversed")).toBe("Ters Kayıtlı");
  });

  /** Ham enum EKRANA BASILMAZ (F-TB1 T5 rozet kusuru dersi). */
  it("hicbir etiket ham enum degeri DEGILDIR", () => {
    for (const status of ["draft", "posted", "reversed"] as const) {
      expect(journalStatusLabel(status)).not.toBe(status);
    }
  });

  it("rozet tonlari durumla eslesir", () => {
    expect(journalStatusVariant("draft")).toBe("neutral");
    expect(journalStatusVariant("posted")).toBe("success");
    expect(journalStatusVariant("reversed")).toBe("danger");
  });
});

describe("eylem görünürlüğü (yönetim kararı 2)", () => {
  it("draft: Duzenle + Sil + Kayitlastir; Storno YOK", () => {
    expect(entryActions("draft")).toEqual({
      canEdit: true,
      canDelete: true,
      canPost: true,
      canReverse: false,
    });
  });

  /**
   * 🔴 BEKÇİ: `posted` fişte düzenle/sil HİÇ SUNULMAZ — sunucu 409 verir ve
   * her zaman patlayan bir düğme kullanıcıya var olmayan bir yetenek vaat
   * ederdi. Yalnız Storno açıktır.
   */
  it("posted: duzenle/sil YOK, YALNIZ Storno", () => {
    expect(entryActions("posted")).toEqual({
      canEdit: false,
      canDelete: false,
      canPost: false,
      canReverse: true,
    });
  });

  it("reversed: HICBIR eylem yok (sonsuz storno zinciri engeli)", () => {
    expect(entryActions("reversed")).toEqual({
      canEdit: false,
      canDelete: false,
      canPost: false,
      canReverse: false,
    });
  });
});

describe("netBalanceTone", () => {
  it("pozitif net bakiye YESIL", () => {
    expect(netBalanceTone("277400.00")).toBe("success");
  });
  it("negatif net bakiye KIRMIZI", () => {
    expect(netBalanceTone("-277400.00")).toBe("danger");
  });
  it("tam sifir NOTR (uydurma isaret basilmaz)", () => {
    expect(netBalanceTone("0.00")).toBe("neutral");
    expect(netBalanceTone("-0.00")).toBe("neutral");
  });
  it("cozulemeyen deger NOTR", () => {
    expect(netBalanceTone("")).toBe("neutral");
  });
});

describe("hasCarriedBalance", () => {
  /** Sıfır devir = gösterilecek bir şey yok; bant basmak gürültü olurdu. */
  it("sifir devir bandi ACMAZ (bicimden bagimsiz)", () => {
    expect(hasCarriedBalance("0")).toBe(false);
    expect(hasCarriedBalance("0.00")).toBe(false);
    expect(hasCarriedBalance("0.0000")).toBe(false);
  });
  it("sifir olmayan devir bandi ACAR (negatif dahil)", () => {
    expect(hasCarriedBalance("1240000.00")).toBe(true);
    expect(hasCarriedBalance("-500.00")).toBe(true);
  });
  it("veri gelmemisken bant ACILMAZ", () => {
    expect(hasCarriedBalance(undefined)).toBe(false);
  });
});
