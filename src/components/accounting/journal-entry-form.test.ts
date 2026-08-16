import { describe, expect, it } from "vitest";

import type { ChartAccountResponse } from "@/lib/api/hooks/useChartOfAccounts";
import type { JournalEntryDetailResponse } from "@/lib/api/hooks/useJournalEntries";

import {
  applyLineAmount,
  changedEntryFields,
  draftsFromEntry,
  emptyJournalLine,
  initialJournalLines,
  isLeafChartAccount,
  isSideLocked,
  JOURNAL_FORM_BLOCKERS,
  journalFormBlockers,
  journalTotals,
  lineFilledSide,
  linesChanged,
  selectableLineAccounts,
  todayIsoDate,
  toJournalLineInputs,
  type JournalEntryFormState,
  type JournalLineDraft,
} from "./journal-entry-form";

function line(overrides: Partial<JournalLineDraft> = {}): JournalLineDraft {
  return { key: "k", accountId: "acc-1", debit: "", credit: "", ...overrides };
}

function form(overrides: Partial<JournalEntryFormState> = {}): JournalEntryFormState {
  return {
    entryDate: "2026-07-18",
    description: "Kasa Devri",
    detailNote: "",
    lines: [
      line({ key: "a", accountId: "acc-1", debit: "100.00" }),
      line({ key: "b", accountId: "acc-2", credit: "100.00" }),
    ],
    ...overrides,
  };
}

function account(code: string, id = code): ChartAccountResponse {
  return {
    id,
    code,
    name: `Hesap ${code}`,
    account_type: "asset",
    is_active: true,
    is_contra: false,
    balance: "0.00",
    class_code: code[0],
    level: code.includes(".") ? 3 : code.length === 2 ? 1 : 2,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  };
}

describe("todayIsoDate — YEREL takvim (TB5 dersi)", () => {
  it("yerel gun/ay/yil okunur, UTC'ye KAYDIRILMAZ", () => {
    // Yerel 1 Temmuz 00:30 — `toISOString()` TR saatinde 30 HAZİRAN yazardı ve
    // fişin donemi (`period_month`, sunucuda entry_date'ten turer) kayardi.
    const localMidnight = new Date(2026, 6, 1, 0, 30);
    expect(todayIsoDate(localMidnight)).toBe("2026-07-01");
  });

  it("tek haneli ay ve gunu sifirla doldurur", () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
  });
});

describe("tek taraflı bacak (ck_journal_lines_single_side)", () => {
  it("borca deger girilince ALACAK temizlenir", () => {
    const filled = applyLineAmount(line({ credit: "500" }), "debit", "300");
    expect(filled).toMatchObject({ debit: "300", credit: "" });
  });

  it("alacaga deger girilince BORC temizlenir", () => {
    const filled = applyLineAmount(line({ debit: "500" }), "credit", "300");
    expect(filled).toMatchObject({ debit: "", credit: "300" });
  });

  it("alan BOSALTILINCA oteki taraf silinmez (yanlislikla veri kaybi yok)", () => {
    const cleared = applyLineAmount(line({ debit: "", credit: "500" }), "debit", "");
    expect(cleared.credit).toBe("500");
  });

  it("dolu taraf otekini KILITLER", () => {
    const debitLine = line({ debit: "100" });
    expect(isSideLocked(debitLine, "credit")).toBe(true);
    expect(isSideLocked(debitLine, "debit")).toBe(false);
    expect(isSideLocked(line(), "credit")).toBe(false);
  });

  it("SIFIR bir tarafi DOLDURMAZ — sunucu (0,0) satirini da reddeder", () => {
    expect(lineFilledSide(line({ debit: "0" }))).toBeNull();
    expect(lineFilledSide(line({ debit: "0.00", credit: "0" }))).toBeNull();
  });

  it("iki taraf da doluysa hicbiri secilmez (engel uretilir)", () => {
    expect(lineFilledSide(line({ debit: "10", credit: "10" }))).toBeNull();
  });
});

describe("journalTotals — DENGE aritmetigi kayan noktayla YAPILMAZ", () => {
  it("esit toplamlarda dengelidir", () => {
    const totals = journalTotals(form().lines);
    expect(totals.totalDebit).toBe("100.00");
    expect(totals.totalCredit).toBe("100.00");
    expect(totals.difference).toBe("0.00");
    expect(totals.isBalanced).toBe(true);
  });

  /**
   * 🔴 AYRIŞMA NOKTASI: `Number` aritmetigi burada `5.55e-17` uretir; kapi
   * kayan noktayla kurulsaydi kullanici EKRANDA dengeli goruneni
   * kaydedemezdi.
   */
  it("0.1 + 0.2 = 0.3 fisi DENGELI sayilir (float kalintisi kapiya sizmaz)", () => {
    const totals = journalTotals([
      line({ key: "a", debit: "0.1" }),
      line({ key: "b", debit: "0.2" }),
      line({ key: "c", credit: "0.3" }),
    ]);
    expect(totals.isBalanced).toBe(true);
    expect(Number("0.1") + Number("0.2")).not.toBe(0.3);
  });

  /**
   * 🔴 İKİNCİ AYRIŞMA NOKTASI — KARŞILAŞTIRMANIN kendisi.
   * `Number(a) === Number(b)` burada `true` der: iki tutar da IEEE-754'te aynı
   * çift-duyarlıklı sayıya yuvarlanır (2^53 üstü). Şema `Numeric(18,2)`ye kadar
   * izin verdiği için bu tutar MEŞRU bir girdidir ve kapı bir liralık kaçağı
   * sessizce dengeli sayardı.
   */
  it("2^53 ustu tutarlarda kapi FLOAT'a KANMAZ", () => {
    const totals = journalTotals([
      line({ key: "a", debit: "9007199254740993.00" }),
      line({ key: "b", credit: "9007199254740992.00" }),
    ]);
    expect(totals.isBalanced).toBe(false);
    expect(totals.difference).toBe("1.00");
    expect(Number("9007199254740993.00") === Number("9007199254740992.00")).toBe(true);
  });

  it("KURUS farki dengesizdir (tolerans YOK — HZ-1 K6)", () => {
    const totals = journalTotals([
      line({ key: "a", debit: "100.00" }),
      line({ key: "b", credit: "99.99" }),
    ]);
    expect(totals.isBalanced).toBe(false);
    expect(totals.difference).toBe("0.01");
  });

  it("cok satirli birikimde de kaymaz (3 x 1.1 vs 3.30)", () => {
    const totals = journalTotals([
      line({ key: "a", debit: "1.1" }),
      line({ key: "b", debit: "1.1" }),
      line({ key: "c", debit: "1.1" }),
      line({ key: "d", credit: "3.30" }),
    ]);
    expect(totals.isBalanced).toBe(true);
  });

  it("bos/gecersiz taraf 0 sayilir, toplam NaN'a dusmez", () => {
    const totals = journalTotals([line({ key: "a", debit: "abc" }), line({ key: "b" })]);
    expect(totals.totalDebit).toBe("0");
    expect(totals.isBalanced).toBe(true);
  });
});

describe("journalFormBlockers — kaydet kapisi", () => {
  it("gecerli fiste engel YOKTUR (kapi ACIK)", () => {
    expect(journalFormBlockers(form())).toEqual([]);
  });

  /** 🔴 MUTASYON KANITI: yalnizca tutar bir kurus oynatilir, kapi KAPANIR. */
  it("bir kurusluk fark kapiyi KAPATIR", () => {
    const off = form({
      lines: [
        line({ key: "a", accountId: "acc-1", debit: "100.00" }),
        line({ key: "b", accountId: "acc-2", credit: "100.01" }),
      ],
    });
    expect(journalFormBlockers(off)).toContain(JOURNAL_FORM_BLOCKERS.unbalanced);
  });

  it("tek satirli fis kapalidir (sunucu en az iki satir ister)", () => {
    const single = form({ lines: [line({ key: "a", debit: "100" })] });
    expect(journalFormBlockers(single)).toContain(JOURNAL_FORM_BLOCKERS.minLines);
  });

  it("satirsiz fis DENGELI gorunse bile kapalidir (0 = 0 tuzagi)", () => {
    const blockers = journalFormBlockers(form({ lines: [] }));
    expect(blockers).toContain(JOURNAL_FORM_BLOCKERS.minLines);
    expect(blockers).not.toContain(JOURNAL_FORM_BLOCKERS.unbalanced);
  });

  it("hesapsiz satir kapiyi kapatir", () => {
    const missing = form({
      lines: [
        line({ key: "a", accountId: "", debit: "100" }),
        line({ key: "b", accountId: "acc-2", credit: "100" }),
      ],
    });
    expect(journalFormBlockers(missing)).toContain(JOURNAL_FORM_BLOCKERS.account);
  });

  it("iki tarafi da dolu satir kapiyi kapatir", () => {
    const both = form({
      lines: [
        line({ key: "a", accountId: "acc-1", debit: "100", credit: "100" }),
        line({ key: "b", accountId: "acc-2", credit: "100" }),
      ],
    });
    expect(journalFormBlockers(both)).toContain(JOURNAL_FORM_BLOCKERS.singleSide);
  });

  it("negatif ve sayi olmayan tutar kapiyi kapatir", () => {
    for (const raw of ["-100", "abc"]) {
      const bad = form({
        lines: [
          line({ key: "a", accountId: "acc-1", debit: raw }),
          line({ key: "b", accountId: "acc-2", credit: "100" }),
        ],
      });
      expect(journalFormBlockers(bad), raw).toContain(JOURNAL_FORM_BLOCKERS.amount);
    }
  });

  it("tarih ve aciklama zorunludur", () => {
    expect(journalFormBlockers(form({ entryDate: "" }))).toContain(JOURNAL_FORM_BLOCKERS.date);
    expect(journalFormBlockers(form({ description: "  " }))).toContain(
      JOURNAL_FORM_BLOCKERS.description,
    );
  });
});

describe("govdeye cevirme", () => {
  it("bos taraf '0' olarak GIDER, undefined DEGIL (NULL fail-closed)", () => {
    const [debitOnly] = toJournalLineInputs([line({ debit: "1500.50" })]);
    expect(debitOnly).toEqual({ account_id: "acc-1", debit: "1500.50", credit: "0" });
    const [plain] = toJournalLineInputs([line({ credit: "250" })]);
    expect(plain).toEqual({ account_id: "acc-1", debit: "0", credit: "250" });
  });

  it("TR virgulu noktaya cevrilir (normalizeDecimalInput tek kaynak)", () => {
    const [first] = toJournalLineInputs([line({ debit: "12,50" })]);
    expect(first.debit).toBe("12.50");
  });

  it("turev/damga alani govdeye SIZMAZ (yalniz uc anahtar)", () => {
    const [first] = toJournalLineInputs([line({ debit: "10" })]);
    expect(Object.keys(first).sort()).toEqual(["account_id", "credit", "debit"]);
  });

  it("linesChanged olcek farkini DEGISIKLIK saymaz ('0' vs '0.00')", () => {
    const next = toJournalLineInputs([line({ key: "a", debit: "100" })]);
    const previous = [{ account_id: "acc-1", debit: "100.00", credit: "0.00" }];
    expect(linesChanged(next, previous)).toBe(false);
  });

  it("linesChanged gercek degisimi yakalar", () => {
    const next = toJournalLineInputs([line({ key: "a", debit: "100" })]);
    expect(linesChanged(next, [{ account_id: "acc-1", debit: "101", credit: "0" }])).toBe(true);
    expect(linesChanged(next, [{ account_id: "acc-9", debit: "100", credit: "0" }])).toBe(true);
    expect(linesChanged(next, [])).toBe(true);
  });
});

describe("changedEntryFields — yalniz DEGISEN alanlar", () => {
  const original = {
    entry_date: "2026-07-18",
    description: "Kasa Devri",
    detail_note: "Ziraat",
  };

  it("hicbir sey degismediyse govde BOSTUR", () => {
    expect(changedEntryFields(form({ detailNote: "Ziraat" }), original)).toEqual({});
  });

  it("yalniz oynayan alani tasir", () => {
    expect(changedEntryFields(form({ description: "Yeni", detailNote: "Ziraat" }), original)).toEqual(
      { description: "Yeni" },
    );
  });

  it("alt aciklama BOSALTILINCA null gider (kolon NULLABLE, gercek temizleme)", () => {
    expect(changedEntryFields(form({ detailNote: "" }), original)).toEqual({ detail_note: null });
  });
});

describe("satir taslaklari", () => {
  it("yeni fis IKI bos satirla acilir (sunucu en az iki ister)", () => {
    expect(initialJournalLines()).toHaveLength(2);
    expect(emptyJournalLine("x")).toEqual({ key: "x", accountId: "", debit: "", credit: "" });
  });

  it("sunucudan gelen bacakta SIFIR taraf BOS gorunur", () => {
    const entry = {
      lines: [
        {
          id: "l1",
          sort_order: 0,
          account_id: "acc-1",
          account_code: "100",
          account_name: "Kasa",
          debit: "1000.00",
          credit: "0.00",
        },
      ],
    } as Pick<JournalEntryDetailResponse, "lines">;
    expect(draftsFromEntry(entry)[0]).toEqual({
      key: "l1",
      accountId: "acc-1",
      debit: "1000.00",
      credit: "",
    });
  });
});

describe("yaprak hesap kurali (backend §4c)", () => {
  const catalog = [account("12"), account("120"), account("120.01"), account("100")];

  it("cocugu olan hesap YAPRAK DEGILDIR (torunlar dahil)", () => {
    expect(isLeafChartAccount(account("12"), catalog)).toBe(false);
    expect(isLeafChartAccount(account("120"), catalog)).toBe(false);
  });

  it("cocugu olmayan hesap yapraktir", () => {
    expect(isLeafChartAccount(account("120.01"), catalog)).toBe(true);
    expect(isLeafChartAccount(account("100"), catalog)).toBe(true);
  });

  it("secici YALNIZ yapraklari sunar (mizan cift saymasin)", () => {
    expect(selectableLineAccounts(catalog).map((item) => item.code)).toEqual(["120.01", "100"]);
    expect(selectableLineAccounts(undefined)).toEqual([]);
  });
});
