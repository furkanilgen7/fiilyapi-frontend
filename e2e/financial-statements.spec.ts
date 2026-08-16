import { test, expect, type Locator, type Page } from "@playwright/test";

import {
  ACCOUNTING_EMPTY_TIME,
  ACCOUNTING_READ_TIME,
  BALANCE_SHEET_DEFAULT_AS_OF,
  BALANCE_SHEET_IMBALANCED_AS_OF,
  BALANCE_SHEET_URL,
  CASH_FLOW_DEFAULT_MONTH,
  CASH_FLOW_DEFAULT_YEAR,
  CASH_FLOW_STATEMENT_URL,
  FINANCIAL_STATEMENTS_URL,
  loginAt,
  openBalanceSheet,
  openCashFlowStatement,
  openFinancialStatementsHome,
} from "./accounting-helpers";

// F-MT T5 · Bilanço + Nakit Akış Tablosu + Mali Tablolar kökünün FONKSİYONEL
// e2e'si. Görsel spec AYRI bir dosyadadır (ayrı görev) ve BU dosyanın adında
// da hiçbir test başlığında "gorsel" GEÇMEZ — beşinci kapı
// (`--grep-invert "gorsel"`) bu dosyayı KOŞTURMALIDIR.
//
// 🔴 Neden `accounting-reports.spec.ts`e eklenmedi: o dosya MU-2'nin iki
// ekranını (Mizan + KDV) bağlar ve kendi başlığında öyle diyor. Mali tablolar
// AYRI uçlar, AYRI rotalar ve AYRI bir sidebar'dır; tek dosyada toplamak
// 500 satırlık bir "muhasebe her şeyi" spec'i doğururdu. ORTAK olan tek şey
// takvim ve giriş akışıdır ve o zaten paylaşılan helper'da (`accounting-helpers.ts`).
//
// ⚠️ `getByRole("alert")` KULLANILMAZ (F-P6 dersi).
// 📅 Saat helper'da, NAVİGASYONDAN ÖNCE dondurulur.

/** Tutar hücrelerinden yalnız rakam/ayraç dizisini okur (`+ `/`- ` öneki atılır). */
async function amountText(cell: Locator): Promise<string> {
  const raw = (await cell.innerText()).trim();
  return raw.replace(/^[+-]\s*/, "");
}

/** BL:51 `Kasa ve Bankalar` satırının tutar hücresi. */
function balanceSheetCashCell(page: Page): Locator {
  return page.getByTestId("bl-assets-current-cash").locator(".fs-side__line-value");
}

/** NA:107-110 `DÖNEM SONU NAKİT` satırının tutar hücresi. */
function cashFlowClosingCell(page: Page): Locator {
  return page.getByTestId("na-closing").locator(".fs-cf-closing__value");
}

test.describe("BFF kökleri (telden)", () => {
  /**
   * 🔴 `balance-sheet` ve `cash-flow-statement` kökleri `route.ts` izin
   * listesinde YAZILI ama "zaten var" VARSAYILMAZ: kök listeden düşerse modül
   * YALNIZ CANLIDA 404 alır ve jsdom testleri bunu GÖRMEZ (F-ST/F-MK dersi).
   *
   * 🔴 Reponun yarası: eski bir BFF bekçisinin TEK iddiası `length > 0`dı ve
   * bu yüzden SAHTEydi. Burada durum kodu VE gövdenin iç aritmetiği ölçülür —
   * proxy bozulur ya da kök listeden düşerse `200` iddiası, gövde şekil
   * değiştirirse aritmetik iddiaları kırmızı olur.
   */
  test("balance-sheet ve cash-flow-statement kökleri BFF'ten geçer", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const balanceSheetResponse = await page.request.get(
      `/api/backend/balance-sheet?as_of=${BALANCE_SHEET_DEFAULT_AS_OF}`,
    );
    const cashFlowResponse = await page.request.get(
      `/api/backend/cash-flow-statement?year=${CASH_FLOW_DEFAULT_YEAR}&month=${CASH_FLOW_DEFAULT_MONTH}`,
    );
    expect(balanceSheetResponse.status()).toBe(200);
    expect(cashFlowResponse.status()).toBe(200);

    // 🔴 `200` iddiasının GERÇEKTEN izin listesini ölçtüğünün kanıtı: listede
    // OLMAYAN bir kök aynı proxy'den 404 döner (`route.ts:352`). Bu satır
    // olmadan yukarıdaki iki `200`, "proxy her şeyi geçiriyor" ihtimalinden
    // ayırt edilemezdi — reponun eski sahte BFF bekçisinin tam olarak kusuru.
    const notAllowed = await page.request.get("/api/backend/balance-sheet-nope");
    expect(notAllowed.status()).toBe(404);

    type Side = {
      total: string;
      sections: Array<{ subtotal: string; lines: Array<{ key: string; amount: string }> }>;
    };
    const balanceSheet = (await balanceSheetResponse.json()) as {
      as_of: string;
      is_balanced: boolean;
      assets: Side;
      liabilities: Side;
    };

    // İstenen AN yanıtta TEKRARLANIR (şema notu: istemci hangi anı gördüğünü
    // kendi isteğinden değil sunucudan okur).
    expect(balanceSheet.as_of).toBe(BALANCE_SHEET_DEFAULT_AS_OF);

    for (const side of [balanceSheet.assets, balanceSheet.liabilities]) {
      // Bölüm ara toplamı KALEMLERDEN, taraf toplamı ARA TOPLAMLARDAN gelir.
      // Fikstür kendi içinde çelişirse ekranın kadrajı anlamsız bir bilanço
      // gösterirdi.
      expect(side.sections.length).toBeGreaterThan(0);
      for (const section of side.sections) {
        expect(section.lines.length).toBeGreaterThan(0);
        const lineSum = section.lines.reduce((total, line) => total + Number(line.amount), 0);
        expect(Number(section.subtotal)).toBeCloseTo(lineSum, 2);
      }
      const sectionSum = side.sections.reduce((total, section) => total + Number(section.subtotal), 0);
      expect(Number(side.total)).toBeCloseTo(sectionSum, 2);
      // Boş/sıfır bir gövde bu testi sessizce geçemesin.
      expect(Number(side.total)).toBeGreaterThan(0);
    }

    // 🔴 `is_balanced` ÖLÇÜLÜR: dengeli dalda iki toplam BİREBİR eşittir.
    expect(balanceSheet.assets.total).toBe(balanceSheet.liabilities.total);
    expect(balanceSheet.is_balanced).toBe(true);

    const cashFlow = (await cashFlowResponse.json()) as {
      year: number;
      month: number;
      sections: Array<{ code: string; subtotal: string; lines: Array<{ amount: string }> }>;
      net_change: string;
      opening_cash: string;
      closing_cash: string;
      monthly_cash: Array<{ year: number; month: number; closing_cash: string }>;
    };

    expect(cashFlow.year).toBe(CASH_FLOW_DEFAULT_YEAR);
    expect(cashFlow.month).toBe(CASH_FLOW_DEFAULT_MONTH);
    // Üç bölüm: A/B/C (ton bu harflerden türer).
    expect(cashFlow.sections.map((section) => section.code)).toEqual(["A", "B", "C"]);
    for (const section of cashFlow.sections) {
      expect(section.lines.length).toBeGreaterThan(0);
      const lineSum = section.lines.reduce((total, line) => total + Number(line.amount), 0);
      expect(Number(section.subtotal)).toBeCloseTo(lineSum, 2);
    }

    // 🔴 K2 — `net_change` = A+B+C (mockup'ın KPI kartı DEĞİL).
    const abc = cashFlow.sections.reduce((total, section) => total + Number(section.subtotal), 0);
    expect(Number(cashFlow.net_change)).toBeCloseTo(abc, 2);
    // Şema kimliği: `closing_cash == opening_cash + net_change`.
    expect(Number(cashFlow.closing_cash)).toBeCloseTo(
      Number(cashFlow.opening_cash) + Number(cashFlow.net_change),
      2,
    );
    expect(Number(cashFlow.closing_cash)).toBeGreaterThan(0);

    // 🔴 `monthly_cash` bir AY SONU BAKİYE serisidir, akış serisi DEĞİL:
    // Ocak'tan seçilen aya kadar uzanır ve SON noktası `closing_cash`e denk
    // düşer. Akış basan bir uygulama aynı veriyle bambaşka bir eğri çizerdi.
    expect(cashFlow.monthly_cash.map((point) => point.month)).toEqual(
      Array.from({ length: CASH_FLOW_DEFAULT_MONTH }, (_, index) => index + 1),
    );
    const lastPoint = cashFlow.monthly_cash[cashFlow.monthly_cash.length - 1];
    expect(lastPoint?.year).toBe(CASH_FLOW_DEFAULT_YEAR);
    expect(lastPoint?.month).toBe(CASH_FLOW_DEFAULT_MONTH);
    expect(lastPoint?.closing_cash).toBe(cashFlow.closing_cash);
  });

  /**
   * 🔴 TANINMAYAN DÖNEM 404 DEĞİLDİR: saat bir gün/ay kayarsa ekran BOŞ
   * inmemeli, yapısal olarak GEÇERLİ ve sıfır bir gövde almalıdır.
   */
  test("tanınmayan dönem 404 değil, sıfır ama yapısal olarak geçerli gövde döner", async ({
    page,
  }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const balanceSheet = await page.request.get("/api/backend/balance-sheet?as_of=2024-03-31");
    expect(balanceSheet.status()).toBe(200);
    const bs = (await balanceSheet.json()) as {
      as_of: string;
      is_balanced: boolean;
      assets: { total: string; sections: unknown[] };
      liabilities: { total: string; sections: unknown[] };
    };
    expect(bs.as_of).toBe("2024-03-31");
    expect(bs.assets.sections.length).toBeGreaterThan(0);
    expect(bs.liabilities.sections.length).toBeGreaterThan(0);
    expect(Number(bs.assets.total)).toBe(0);
    expect(Number(bs.liabilities.total)).toBe(0);
    // Sıfır bilanço DENGEDEDİR ve bu doğrudur.
    expect(bs.is_balanced).toBe(true);

    const cashFlow = await page.request.get("/api/backend/cash-flow-statement?year=2024&month=3");
    expect(cashFlow.status()).toBe(200);
    const cf = (await cashFlow.json()) as {
      sections: unknown[];
      net_change: string;
      closing_cash: string;
      monthly_cash: Array<{ closing_cash: string }>;
    };
    expect(cf.sections.length).toBe(3);
    expect(Number(cf.net_change)).toBe(0);
    // Grafik yine bir eğri çizebilsin: seri Ocak..Mart uzunluğundadır.
    expect(cf.monthly_cash.length).toBe(3);
    expect(cf.monthly_cash[cf.monthly_cash.length - 1]?.closing_cash).toBe(cf.closing_cash);
  });
});

/**
 * 🔴🔴 TEK KAYNAK BEKÇİSİ — bu görevin KALBİ.
 *
 * Üründe Bilanço'nun `Kasa ve Bankalar` kalemi ile Nakit Akış Tablosu'nun
 * `DÖNEM SONU NAKİT`i AYNI hesap grubundan (10) türer (KK-2) ⇒ EŞİTtirler.
 * Mockup'lar burada birbiriyle çelişiyor (BL:51 `4.249.500` ↔ NA:109
 * `6.249.500`); fikstür çelişkiyi TAŞIMAZ.
 *
 * Ölçüm İKİ EKRANIN BASILMIŞ HÂLİNDEN yapılır (fikstür alanlarından değil):
 * tek taraflı bir fikstür düzenlemesi — ya da ekranlardan birinin yanlış alanı
 * basması — burada KIRMIZI olur.
 */
test.describe("Tek kaynak: Kasa ve Bankalar = Dönem Sonu Nakit", () => {
  test("varsayılan dönemde iki ekran AYNI nakit rakamını basar", async ({ page }) => {
    await openBalanceSheet(page);
    const cashOnBalanceSheet = await amountText(balanceSheetCashCell(page));

    await openCashFlowStatement(page);
    const closingCash = await amountText(cashFlowClosingCell(page));

    expect(cashOnBalanceSheet).toBe(closingCash);
    // Sıfır/boş iki ekran da "eşit" olurdu; iddia gerçek bir sayı üzerinde.
    expect(cashOnBalanceSheet).toBe("6.249.500");
  });

  test("DENGESİZ (Ocak) dalında da iki ekran AYNI nakit rakamını basar", async ({ page }) => {
    await openBalanceSheet(page, ACCOUNTING_EMPTY_TIME);
    const cashOnBalanceSheet = await amountText(balanceSheetCashCell(page));

    await openCashFlowStatement(page, ACCOUNTING_EMPTY_TIME);
    const closingCash = await amountText(cashFlowClosingCell(page));

    // Bilanço dengesizken bile NAKİT tek kaynaktan gelir.
    expect(cashOnBalanceSheet).toBe(closingCash);
    expect(cashOnBalanceSheet).toBe("1.200.000");
  });
});

test.describe("Bilanço ekranı (BL)", () => {
  test("dolu gün: iki taraf, DENGE banner'ı ve GENEL TOPLAM basılır", async ({ page }) => {
    await openBalanceSheet(page);

    await expect(page.getByRole("heading", { level: 1, name: "Bilanço" })).toBeVisible();
    // 🔴 NOKTA-ZAMAN seçici: içinde bulunulan ayın SON günü seçilidir.
    await expect(page.getByTestId("bl-as-of")).toHaveValue(BALANCE_SHEET_DEFAULT_AS_OF);

    const banner = page.getByTestId("bl-banner");
    await expect(banner).toHaveClass(/fs-banner--ok/);
    await expect(banner).toContainText("Bilanço Dengede");

    // İki taraf da AYNI genel toplamı basar.
    await expect(page.getByTestId("bl-assets-total")).toContainText("22.642.220");
    await expect(page.getByTestId("bl-liabilities-total")).toContainText("22.642.220");
    // Ara toplamlar ve bölüm bantları kadrajda.
    await expect(page.getByTestId("bl-assets-current-subtotal")).toContainText("18.782.220");
    await expect(page.getByTestId("bl-liabilities-equity-band")).toContainText("ÖZKAYNAKLAR");

    // Devre-dışı yüzey + GÖRÜNÜR gerekçe (`title`da SAKLANMAZ).
    await expect(page.getByTestId("bl-export-pdf")).toBeDisabled();
    await expect(page.getByTestId("bl-export-reason")).toBeVisible();
    await expect(page.getByTestId("bl-error")).toHaveCount(0);
  });

  test("🔴 DENGESİZ gün: banner tonu döner ve fark basılır (K3)", async ({ page }) => {
    await openBalanceSheet(page, ACCOUNTING_EMPTY_TIME);

    await expect(page.getByTestId("bl-as-of")).toHaveValue(BALANCE_SHEET_IMBALANCED_AS_OF);
    const banner = page.getByTestId("bl-banner");
    await expect(banner).toHaveClass(/fs-banner--off/);
    await expect(banner).toContainText("Bilanço Dengede Değil");
    // |1.500.000 − 1.360.000| = 140.000 · 🔴 `≠` YAZILMAZ (F-SEM glif kuralı).
    await expect(banner).toContainText("fark: ₺ 140.000");
    await expect(banner).toContainText("eşit değil");
  });

  test("drill sidebar'da TAM BİR öğe aria-current taşır (K7)", async ({ page }) => {
    await openBalanceSheet(page);
    const sidebar = page.getByRole("complementary", { name: "Mali tablolar menüsü" });
    const active = sidebar.locator("[aria-current='page']");
    // 🔴 ÜST öğe (`Mali Tablolar`) `exact`tir; olmasaydı burada İKİ tane çıkardı.
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("Bilanço");
  });
});

test.describe("Nakit Akış Tablosu ekranı (NA)", () => {
  test("dolu dönem: KPI şeridi, A/B/C bölümleri ve üç satırlı kapanış basılır", async ({
    page,
  }) => {
    await openCashFlowStatement(page);

    // 🔴 Sayfa başlığı sidebar etiketinden (`Nakit Akışı`) FARKLIdır.
    await expect(page.getByRole("heading", { level: 1, name: "Nakit Akış Tablosu" })).toBeVisible();
    await expect(page.getByTestId("na-period")).toHaveValue("2026-07");

    await expect(page.getByTestId("na-kpi-operating")).toContainText("+ 5.842.000");
    await expect(page.getByTestId("na-kpi-investing")).toContainText("- 1.240.000");
    await expect(page.getByTestId("na-kpi-financing")).toContainText("- 800.000");

    await expect(page.getByTestId("na-opening")).toContainText("2.447.500");
    await expect(page.getByTestId("na-section-operating-collections")).toContainText("+ 24.994.700");
    await expect(page.getByTestId("na-section-operating-subtotal")).toContainText("+ 5.842.000");

    await expect(page.getByTestId("na-export-pdf")).toBeDisabled();
    await expect(page.getByTestId("na-export-reason")).toBeVisible();
    await expect(page.getByTestId("na-error")).toHaveCount(0);
  });

  /**
   * 🔴 K2 — KPI kartı ile tablonun ORTA kapanış satırı AYNI sunucu alanını
   * (`net_change`) basar. Mockup'ın kartı (NA:58 `+ 4.802.000`) tablosuyla
   * çelişiyordu; ekran A+B+C'yi YENİDEN TOPLAMAZ.
   */
  test("K2 · KPI kartı ile NET NAKİT DEĞİŞİMİ satırı AYNI sayıyı basar", async ({ page }) => {
    await openCashFlowStatement(page);

    const kpi = await amountText(page.getByTestId("na-kpi-net").locator(".fs-cf-kpi__value"));
    const row = await amountText(page.getByTestId("na-net-change").locator(".fs-cf-closing__value"));

    expect(kpi).toBe(row);
    // Mockup'ın KPI kartındaki 4.802.000 DEĞİL, aritmetiği doğru olan sayı.
    expect(kpi).toBe("3.802.000");
  });

  /** Grafik bir AY SONU BAKİYE serisidir ve son noktası kapanışa denk düşer. */
  test("aylık nakit grafiği yedi ay çizer ve son noktası DÖNEM SONU NAKİT'tir", async ({
    page,
  }) => {
    await openCashFlowStatement(page);

    await expect(page.getByTestId("na-chart-empty")).toHaveCount(0);
    const chart = page.getByTestId("na-chart").getByRole("img");
    await expect(chart).toHaveAttribute("aria-label", "Aylık nakit pozisyonu — 7 ay, dönem sonu 6.249.500");
    await expect(page.getByTestId("na-chart").locator("text")).toHaveCount(7);
  });

  test("K8 · projeksiyon kartı devre dışıdır ve gerekçesi GÖRÜNÜRdür", async ({ page }) => {
    await openCashFlowStatement(page);
    await expect(page.getByTestId("na-projection")).toBeVisible();
    await expect(page.getByTestId("na-projection-reason")).toBeVisible();
  });

  test("drill sidebar'da TAM BİR öğe aria-current taşır (K7)", async ({ page }) => {
    await openCashFlowStatement(page);
    const sidebar = page.getByRole("complementary", { name: "Mali tablolar menüsü" });
    const active = sidebar.locator("[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("Nakit Akışı");
  });
});

test.describe("Mali Tablolar kökü (E11)", () => {
  test("üç veri kartı da devre dışıdır ve gerekçeleri GÖRÜNÜRdür", async ({ page }) => {
    await openFinancialStatementsHome(page);

    await expect(page.getByRole("heading", { level: 1, name: "Mali Tablolar" })).toBeVisible();

    for (const testId of ["mt-income-statement", "mt-performance", "mt-profitability"]) {
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.getByTestId(`${testId}-reason`)).toBeVisible();
    }

    await expect(page.getByTestId("mt-export-pdf")).toBeDisabled();
    await expect(page.getByTestId("mt-export-reason")).toBeVisible();
    await expect(page.getByTestId("mt-period-prev")).toBeDisabled();
    await expect(page.getByTestId("mt-period-next")).toBeDisabled();
    await expect(page.getByTestId("mt-project-filter")).toBeDisabled();
    await expect(page.getByTestId("mt-period-reason")).toBeVisible();
    await expect(page.getByTestId("mt-project-filter-reason")).toBeVisible();
  });

  /**
   * 🔴 KÖKTE DRILL SIDEBAR YOKTUR (E11 düz kabuğu çizer). Bu yüzden K7 bekçisi
   * burada SAYFANIN TAMAMINA bakar: kabuk menüsünün `Mali Tablolar` girdisi
   * TEK `aria-current`tır. Segment denetiminin "bulunulan" öğesi de
   * `aria-current` SÜRMEZ — ikincisi ekran okuyucuya iki sayfa derdi.
   */
  test("kökte drill sidebar YOK ve sayfada TAM BİR aria-current vardır (K7)", async ({ page }) => {
    await openFinancialStatementsHome(page);

    await expect(page.getByRole("complementary", { name: "Mali tablolar menüsü" })).toHaveCount(0);
    const active = page.locator("[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("Mali Tablolar");
  });

  test("segment denetimi iki yaprak ekrana gider", async ({ page }) => {
    await openFinancialStatementsHome(page);

    await page.getByTestId("mt-seg-bilanco").click();
    await expect(page).toHaveURL(new RegExp(`${BALANCE_SHEET_URL}$`));
    await expect(page.getByTestId("bl-loaded")).toBeAttached();

    // Geri bağlantısı kökü gösterir (BL:33).
    await page.getByTestId("bl-back").click();
    await expect(page).toHaveURL(new RegExp(`${FINANCIAL_STATEMENTS_URL}$`));

    await page.getByTestId("mt-seg-nakit-akisi").click();
    await expect(page).toHaveURL(new RegExp(`${CASH_FLOW_STATEMENT_URL}$`));
    await expect(page.getByTestId("na-loaded")).toBeAttached();
  });
});
