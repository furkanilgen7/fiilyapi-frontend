import { describe, it, expect } from "vitest";

import { formatMonthName } from "@/lib/format";

import {
  BANK_ACCOUNT_IDENTITY_EMPTY,
  BANK_ACCOUNT_TYPE_LABELS,
  UPCOMING_SOURCE_DOCUMENT_NO_KIND,
  UPCOMING_SOURCE_HAS_COUNTERPARTY,
  UPCOMING_PERIOD_EMPTY,
  UPCOMING_SOURCE_LABELS,
  bankAccountIdentityLine,
  isUpcomingCounterpartyMissing,
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

/**
 * F-HZ2 T2 · TB8 üçüncü kaynak `payroll`. Sunucu bordro satırını
 * `counterparty: null` + `document_no: "2026-07"` (`f"{yil:04d}-{ay:02d}"`)
 * olarak verir. Mockup E9:117 AYNEN "Bordro – Temmuz" çizer: karşı taraf adı
 * YOK (bordronun dış karşı tarafı yoktur), `#` YOK (numara değil DÖNEM).
 */
describe("upcomingPaymentTitle — bordro satırı (E9:117 · TB8)", () => {
  it("E9:117'yi birebir kurar: 'Bordro – Temmuz'", () => {
    // Arrange — sunucunun bordro satırı (backend `upcoming.py:_payroll_rows`).
    const item = {
      counterparty: null,
      document_no: "2026-07",
      source_type: "payroll" as const,
    };

    // Act
    const title = upcomingPaymentTitle(item);

    // Assert — elle yazılmış sabit; ayraç U+2013 EN-DASH (mockup kodnoktası).
    expect(title).toBe("Bordro – Temmuz");
  });

  it("baştaki ayraç BASILMAZ — 'Karşı taraf belirtilmemiş' dalına DÜŞMEZ", () => {
    const title = upcomingPaymentTitle({
      counterparty: null,
      document_no: "2026-07",
      source_type: "payroll",
    });

    // " – Bordro – Temmuz" gibi baştan sarkan bir ayraç mockup'ta YOKTUR.
    expect(title.startsWith(" – ")).toBe(false);
    expect(title.startsWith("–")).toBe(false);
    // Bordroda NULL karşı taraf EKSİKLİK DEĞİL TANIMDIR — düşüş metni basılmaz.
    expect(title).not.toContain("Karşı taraf belirtilmemiş");
  });

  it("bordroda '#' YOK — ama fatura ve hakedişte HÂLÂ VAR", () => {
    const payroll = upcomingPaymentTitle({
      counterparty: null,
      document_no: "2026-07",
      source_type: "payroll",
    });
    expect(payroll).not.toContain("#");

    // 🔴 İkinci iddia ŞART: '#'i tümden silen bir uygulama da ilkini geçerdi.
    expect(
      upcomingPaymentTitle({
        counterparty: "Akın İnşaat",
        document_no: "47",
        source_type: "subcontractor_progress_payment",
      }),
    ).toBe("Akın İnşaat – Hakediş #47");
    expect(
      upcomingPaymentTitle({
        counterparty: "Yılmaz Elektrik",
        document_no: "FT-2026-118",
        source_type: "invoice",
      }),
    ).toBe("Yılmaz Elektrik – Fatura #FT-2026-118");
    expect(
      upcomingPaymentTitle({
        counterparty: null,
        document_no: "12",
        source_type: "invoice",
      }),
    ).toBe("Karşı taraf belirtilmemiş – Fatura #12");
  });

  it.each([
    ["2026-01", "Bordro – Ocak"],
    ["2026-07", "Bordro – Temmuz"],
    ["2026-12", "Bordro – Aralık"],
  ])("sınır ayı: document_no '%s' → '%s'", (documentNo, expected) => {
    // Beklenen çıktı ELLE yazılmıştır — ay adı ifadesi teste kopyalanmaz.
    expect(
      upcomingPaymentTitle({
        counterparty: null,
        document_no: documentNo,
        source_type: "payroll",
      }),
    ).toBe(expected);
  });

  it("ay adı TEK KAYNAKTAN (`formatMonthName`) türer — 1..12'nin hepsinde", () => {
    // Bu iddia yukarıdaki sınır aylarının YERİNE GEÇMEZ, EK'tir: ikinci bir ay
    // adı dizisi (ör. bu dosyaya kopyalanmış) bir gün `TR_MONTHS`ten ayrışır.
    for (let month = 1; month <= 12; month += 1) {
      const title = upcomingPaymentTitle({
        counterparty: null,
        document_no: `2026-${String(month).padStart(2, "0")}`,
        source_type: "payroll",
      });
      // Ay parçası EN-DASH ayracından sonra gelir.
      expect(title.split(" – ")[1]).toBe(formatMonthName(month));
    }
  });

  it.each(["abc", "2026-13", "", "2026-00", "0000-99"])(
    "bozuk document_no '%s' zarif düşer — 'undefined'/'NaN'/'null' BASMAZ",
    (documentNo) => {
      const title = upcomingPaymentTitle({
        counterparty: null,
        document_no: documentNo,
        source_type: "payroll",
      });

      expect(title).not.toContain("undefined");
      expect(title).not.toContain("NaN");
      expect(title).not.toContain("null");
      // WORKFLOW §3: sessiz atlama da yok — satır GÖRÜNÜR bir şey basar.
      expect(title.trim().length).toBeGreaterThan(0);
    },
  );
});

describe("UPCOMING_SOURCE_LABELS — TB8 sonrası ÜÇ kaynak", () => {
  it("üç üyeyi de elle yazılmış değerlerle taşır", () => {
    expect(UPCOMING_SOURCE_LABELS.invoice).toBe("Fatura");
    expect(UPCOMING_SOURCE_LABELS.subcontractor_progress_payment).toBe("Hakediş");
    expect(UPCOMING_SOURCE_LABELS.payroll).toBe("Bordro");
  });

  it("anahtar kümesi TAM OLARAK bu üçüdür — derleyiciye güvenilmez", () => {
    // `Record<Enum, …>` eksikliği derleme zamanında yakalar ama görsel/çalışma
    // zamanı davranışını kanıtlamaz; anahtarlar RUNTIME'da sayılır.
    expect(Object.keys(UPCOMING_SOURCE_LABELS).sort()).toEqual([
      "invoice",
      "payroll",
      "subcontractor_progress_payment",
    ]);
  });
});

/**
 * F-HZ2 T2 · "dış karşı tarafı YOK" ile "`document_no` bir DÖNEM" İKİ AYRI
 * olgudur ve TEK bayrağa birleştirilmez: dördüncü bir kaynak eklendiğinde
 * `Record<UpcomingSourceType, …>` eksiksizlik istediği için İKİ karar da
 * ayrı ayrı sorulur, biri diğerinin arkasına saklanamaz.
 */
describe("isUpcomingCounterpartyMissing — NULL her kaynakta EKSİKLİK değildir", () => {
  it("🔴 bordroda NULL karşı taraf EKSİKLİK DEĞİL TANIMDIR", () => {
    expect(
      isUpcomingCounterpartyMissing({ counterparty: null, source_type: "payroll" }),
    ).toBe(false);
  });

  it("fatura ve hakedişte NULL karşı taraf GERÇEKTEN eksiktir", () => {
    expect(
      isUpcomingCounterpartyMissing({ counterparty: null, source_type: "invoice" }),
    ).toBe(true);
    expect(
      isUpcomingCounterpartyMissing({
        counterparty: null,
        source_type: "subcontractor_progress_payment",
      }),
    ).toBe(true);
  });

  it("dolu karşı taraf hiçbir kaynakta eksik sayılmaz", () => {
    expect(
      isUpcomingCounterpartyMissing({
        counterparty: "Yılmaz Elektrik",
        source_type: "invoice",
      }),
    ).toBe(false);
  });
});

describe("UPCOMING_SOURCE_HAS_COUNTERPARTY — dış karşı tarafı olan kaynaklar", () => {
  it("üç üyeyi de elle yazılmış değerlerle taşır", () => {
    expect(UPCOMING_SOURCE_HAS_COUNTERPARTY.invoice).toBe(true);
    expect(UPCOMING_SOURCE_HAS_COUNTERPARTY.subcontractor_progress_payment).toBe(true);
    expect(UPCOMING_SOURCE_HAS_COUNTERPARTY.payroll).toBe(false);
  });

  it("anahtar kümesi TAM OLARAK bu üçüdür", () => {
    expect(Object.keys(UPCOMING_SOURCE_HAS_COUNTERPARTY).sort()).toEqual([
      "invoice",
      "payroll",
      "subcontractor_progress_payment",
    ]);
  });
});

describe("UPCOMING_SOURCE_DOCUMENT_NO_KIND — evrak no mu DÖNEM mi", () => {
  it("üç üyeyi de elle yazılmış değerlerle taşır", () => {
    expect(UPCOMING_SOURCE_DOCUMENT_NO_KIND.invoice).toBe("document");
    expect(UPCOMING_SOURCE_DOCUMENT_NO_KIND.subcontractor_progress_payment).toBe("document");
    expect(UPCOMING_SOURCE_DOCUMENT_NO_KIND.payroll).toBe("period");
  });

  it("anahtar kümesi TAM OLARAK bu üçüdür", () => {
    expect(Object.keys(UPCOMING_SOURCE_DOCUMENT_NO_KIND).sort()).toEqual([
      "invoice",
      "payroll",
      "subcontractor_progress_payment",
    ]);
  });

  it("iki kayıt BİRLEŞTİRİLMEZ — aynı olguyu ölçmezler", () => {
    // Bugün ikisi de bordroda "özel" ama gerekçeleri farklıdır; birleştirilseydi
    // dördüncü bir kaynak (ör. dış karşı tarafı OLAN ama dönemle numaralanan)
    // iki kararın birini sessizce yanlış alırdı.
    expect(UPCOMING_SOURCE_HAS_COUNTERPARTY.payroll).toBe(false);
    expect(UPCOMING_SOURCE_DOCUMENT_NO_KIND.payroll).toBe("period");
    expect(UPCOMING_SOURCE_HAS_COUNTERPARTY.invoice).toBe(true);
    expect(UPCOMING_SOURCE_DOCUMENT_NO_KIND.invoice).toBe("document");
  });
});

/**
 * F-HZ2 FINAL REVIEW · SARKAN AYRAÇ. `document_no` şemada `minLength` TAŞIMAZ
 * (`openapi.json`: `{"type": "string"}`), yani boş dize sözleşmeye göre
 * yasaldır. Ham boş dizeye düşülürse başlık `"Bordro – "` olur — "baştaki
 * ayraç basılmaz" kuralının KUYRUKTAKİ aynı kusuru. T2'nin
 * `trim().length > 0` iddiası bunu YAKALAMIYORDU ("Bordro –" 8 karakterdir).
 */
describe("upcomingPaymentTitle — bordroda SARKAN AYRAÇ basılmaz", () => {
  it.each(["", "   ", "\t"])(
    "boş/boşluklu document_no (%j) açık ifadeye düşer, ayraç sarkmaz",
    (documentNo) => {
      const title = upcomingPaymentTitle({
        counterparty: null,
        document_no: documentNo,
        source_type: "payroll",
      });

      // Elle yazılmış beklenen değer.
      expect(title).toBe("Bordro – Dönem belirtilmemiş");
      // Ayraç kuyrukta SARKMAZ.
      expect(title.endsWith("–")).toBe(false);
      expect(title.trimEnd().endsWith("–")).toBe(false);
    },
  );

  it("zarif düşüş metni TEK KAYNAKTAN gelir", () => {
    expect(UPCOMING_PERIOD_EMPTY).toBe("Dönem belirtilmemiş");
  });

  it("🔴 KAPSAM DAR: bozuk ama DOLU document_no HAM basılmayı sürdürür", () => {
    // İkinci iddia ŞART: her bozuk girdiyi bu ifadeyle örten bir uygulama
    // gerçek veriyi GİZLERDİ ve yukarıdaki testi yine de geçerdi.
    expect(
      upcomingPaymentTitle({
        counterparty: null,
        document_no: "abc",
        source_type: "payroll",
      }),
    ).toBe("Bordro – abc");
    expect(
      upcomingPaymentTitle({
        counterparty: null,
        document_no: "2026-13",
        source_type: "payroll",
      }),
    ).toBe("Bordro – 2026-13");
    // Geçerli dönem hiç etkilenmedi.
    expect(
      upcomingPaymentTitle({
        counterparty: null,
        document_no: "2026-07",
        source_type: "payroll",
      }),
    ).toBe("Bordro – Temmuz");
  });
});
