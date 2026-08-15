import { describe, it, expect } from "vitest";

import {
  BANK_ACCOUNT_IDENTITY_EMPTY,
  BANK_ACCOUNT_TYPE_LABELS,
  bankAccountIdentityLine,
  treasuryCardGradientVar,
  upcomingDaysText,
  upcomingPaymentTitle,
  upcomingPaymentTone,
} from "./treasury-labels";

describe("bankAccountIdentityLine — E9:73/78/83", () => {
  it("IBAN varsa IBAN'ı basar", () => {
    // Arrange
    const account = { iban: "TR12 0001 0093 0012 3456 7890", display_name: "Ana Hesap" };
    // Act
    const line = bankAccountIdentityLine(account);
    // Assert — E9:73, IBAN görünen adı EZER
    expect(line).toEqual({ text: "TR12 0001 0093 0012 3456 7890", isMissing: false });
  });

  it("IBAN yoksa display_name'e düşer (E9:83 'Merkez Kasa' dalı)", () => {
    expect(bankAccountIdentityLine({ iban: null, display_name: "Merkez Kasa" })).toEqual({
      text: "Merkez Kasa",
      isMissing: false,
    });
  });

  it("boş dize de IBAN sayılmaz — display_name'e düşer", () => {
    expect(bankAccountIdentityLine({ iban: "", display_name: "Merkez Kasa" }).text).toBe(
      "Merkez Kasa",
    );
  });

  it("ikisi de yoksa zarif düşüş metnini işaretiyle döner", () => {
    expect(bankAccountIdentityLine({ iban: null, display_name: null })).toEqual({
      text: BANK_ACCOUNT_IDENTITY_EMPTY,
      isMissing: true,
    });
  });
});

describe("BANK_ACCOUNT_TYPE_LABELS — E9:71/81", () => {
  it("checking → 'Vadesiz', cash → 'Kasa'", () => {
    expect(BANK_ACCOUNT_TYPE_LABELS.checking).toBe("Vadesiz");
    expect(BANK_ACCOUNT_TYPE_LABELS.cash).toBe("Kasa");
  });
});

describe("treasuryCardGradientVar — E9:70/75/80", () => {
  it("SIRA bazlıdır ve üçlü döngü yapar", () => {
    const vars = [0, 1, 2, 3, 4, 5].map(treasuryCardGradientVar);
    expect(vars).toEqual([
      "var(--gradient-treasury-card-1)",
      "var(--gradient-treasury-card-2)",
      "var(--gradient-treasury-card-3)",
      "var(--gradient-treasury-card-1)",
      "var(--gradient-treasury-card-2)",
      "var(--gradient-treasury-card-3)",
    ]);
  });

  it("aynı index HER ÇAĞRIDA aynı degradeyi verir (deterministik)", () => {
    for (const index of [0, 1, 2, 7, 41]) {
      expect(treasuryCardGradientVar(index)).toBe(treasuryCardGradientVar(index));
    }
    // Rastgelelik/tip bağı olmadığının kanıtı: 7 % 3 === 1 → ikinci degrade.
    expect(treasuryCardGradientVar(7)).toBe("var(--gradient-treasury-card-2)");
    expect(treasuryCardGradientVar(41)).toBe("var(--gradient-treasury-card-3)");
  });
});

describe("upcomingPaymentTone — onaylı sapma: ton days_remaining ile MONOTON", () => {
  it.each([
    [-3, "danger"],
    [0, "danger"],
    [1, "danger"],
    [2, "danger"],
    [3, "warning"],
    [4, "warning"],
    [5, "success"],
    [7, "success"],
    [30, "success"],
  ])("%i gün → %s", (days, expected) => {
    expect(upcomingPaymentTone(days)).toBe(expected);
  });

  it("ton hiçbir yerde geri dönmez — gün arttıkça aciliyet AZALIR", () => {
    // Mockup'ın iç tutarsızlığı (2 gün turuncu, 3 gün KIRMIZI) burada
    // yeniden üretilmez; sıralama danger → warning → success olmalıdır.
    const rank = { danger: 0, warning: 1, success: 2 } as const;
    const days = [-5, -1, 0, 1, 2, 3, 4, 5, 6, 7, 20, 90];
    const ranks = days.map((day) => rank[upcomingPaymentTone(day)]);
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1] as number);
    }
    // Üç tonun HEPSİ gerçekten kullanılır (tek tona çökmüş değil).
    expect(new Set(ranks).size).toBe(3);
  });
});

describe("upcomingDaysText — E9:113 '2 gün kaldı'", () => {
  it("pozitif günde mockup cümlesini kurar", () => {
    expect(upcomingDaysText(2)).toBe("2 gün kaldı");
    expect(upcomingDaysText(7)).toBe("7 gün kaldı");
  });

  it("0 ve negatif günde cümleyi BOZMAZ ('-2 gün kaldı' basmaz)", () => {
    expect(upcomingDaysText(0)).toBe("Bugün son gün");
    expect(upcomingDaysText(-2)).toBe("2 gün gecikti");
    expect(upcomingDaysText(-2)).not.toContain("-2");
    expect(upcomingDaysText(0)).not.toContain("0 gün kaldı");
  });
});

describe("upcomingPaymentTitle — E9:113/121", () => {
  it("karşı taraf + kaynak etiketi + evrak no birleşimini EN-DASH ile kurar", () => {
    const title = upcomingPaymentTitle({
      counterparty: "Akın İnşaat",
      document_no: "47",
      source_type: "subcontractor_progress_payment",
    });
    expect(title).toBe("Akın İnşaat – Hakediş #47");
    // Ayraç en-dash (U+2013), düz tire DEĞİL.
    expect(title).toContain("–");
    expect(title).not.toContain(" - ");
  });

  it("fatura kaynağı 'Fatura' etiketini alır", () => {
    expect(
      upcomingPaymentTitle({
        counterparty: "Yılmaz Elektrik",
        document_no: "FT-2026-118",
        source_type: "invoice",
      }),
    ).toBe("Yılmaz Elektrik – Fatura #FT-2026-118");
  });

  it("counterparty NULL ise zarif düşüş metnini kullanır, satırı YUTMAZ", () => {
    const title = upcomingPaymentTitle({
      counterparty: null,
      document_no: "12",
      source_type: "invoice",
    });
    expect(title).toBe("Karşı taraf belirtilmemiş – Fatura #12");
    expect(title).not.toContain("null");
  });
});
