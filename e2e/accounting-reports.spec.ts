import { test, expect } from "@playwright/test";

import {
  ACCOUNTING_EMPTY_TIME,
  ACCOUNTING_READ_TIME,
  ACCOUNTING_VAT_CARRIED_TIME,
  loginAt,
  openTrialBalance,
  openVatReturn,
} from "./accounting-helpers";

// F-MU2 T5 · Mizan + KDV Beyannamesi ekranlarının FONKSİYONEL e2e'si — görsel
// spec AYRI dosyadadır (T6). Bu dosyanın adında "gorsel" GEÇMEZ ki beşinci
// kapıda (`--grep-invert "gorsel"`) koşsun.
//
// ⚠️ `getByRole("alert")` KULLANILMAZ (F-P6 dersi).
// 📅 Saat DONDURULUR (`accounting-helpers.ts`).

test.describe("BFF kökleri (telden)", () => {
  /**
   * 🔴 `trial-balance` ve `vat-return` kökleri `route.ts` izin listesinde
   * YAZILI ama "zaten var" VARSAYILMAZ: kök listeden düşerse modül YALNIZ
   * CANLIDA 404 alır ve jsdom testleri bunu GÖRMEZ (F-ST/F-MK dersi).
   */
  test("trial-balance ve vat-return kökleri BFF'ten geçer", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const trialBalance = await page.request.get("/api/backend/trial-balance?year=2026&month=7");
    const vatReturn = await page.request.get("/api/backend/vat-return?year=2026&month=6");
    expect(trialBalance.status()).toBe(200);
    expect(vatReturn.status()).toBe(200);

    const tb = (await trialBalance.json()) as {
      is_balanced: boolean;
      rows: Array<{
        opening_debit: string;
        opening_credit: string;
        period_debit: string;
        period_credit: string;
        closing_debit: string;
        closing_credit: string;
      }>;
      totals: Record<string, string>;
    };

    // 🔴 SATIR-İÇİ ARİTMETİK: kapanış NET'tir — `(açılış borç − açılış alacak)
    // + (dönem borç − dönem alacak)`. Fikstür kendi içinde çelişirse ekranın
    // kadrajı anlamsız bir mizan gösterirdi.
    for (const row of tb.rows) {
      const net =
        Number(row.opening_debit) -
        Number(row.opening_credit) +
        Number(row.period_debit) -
        Number(row.period_credit);
      expect(Number(row.closing_debit)).toBeCloseTo(Math.max(net, 0), 2);
      expect(Number(row.closing_credit)).toBeCloseTo(Math.max(-net, 0), 2);
      // Kapanış NET ⇒ en fazla BİR taraf dolu.
      expect(Number(row.closing_debit) > 0 && Number(row.closing_credit) > 0).toBe(false);
    }

    // 🔴 `period_*` BRÜTtür: en az bir satırda İKİ taraf da doludur (MZ:85-86).
    const grossRows = tb.rows.filter(
      (row) => Number(row.period_debit) > 0 && Number(row.period_credit) > 0,
    );
    expect(grossRows.length).toBeGreaterThan(0);

    // Toplamlar satırlarla UZLAŞIR (K15: satırlar kazanır).
    // 🔴 ALTI kolonun HEPSİ: dördünü ölçüp "toplamlar uzlaşıyor" demek,
    // ölçülmeyen ikisini (`opening_credit` ve fikstürün EN BÜYÜK sayısı olan
    // `period_credit`) bekçisiz bırakırdı.
    for (const key of [
      "opening_debit",
      "opening_credit",
      "period_debit",
      "period_credit",
      "closing_debit",
      "closing_credit",
    ]) {
      const rowSum = tb.rows.reduce(
        (total, row) => total + Number(row[key as keyof (typeof tb.rows)[number]]),
        0,
      );
      expect(Number(tb.totals[key])).toBeCloseTo(rowSum, 2);
    }
    // Temmuz DENGELİdir ve `is_balanced` bunu TOPLAMLARDAN söyler.
    expect(tb.totals.closing_debit).toBe(tb.totals.closing_credit);
    expect(tb.is_balanced).toBe(true);

    const vat = (await vatReturn.json()) as {
      calculated_vat: string;
      deductible_vat: string;
      payable: string;
      carried_forward: string;
      taxable_rows: Array<{ rate: string; base: string; vat: string }>;
      exempt_base: string;
      deductions: Array<{ source: string }>;
    };
    // 🔴 `payable` ve `carried_forward` AYNI ANDA sıfırdan büyük OLAMAZ.
    expect(Number(vat.payable) > 0 && Number(vat.carried_forward) > 0).toBe(false);
    expect(Number(vat.payable)).toBeCloseTo(
      Number(vat.calculated_vat) - Number(vat.deductible_vat),
      2,
    );
    // 🔴 `rate = 0` satırı listeye GİRMEZ; istisna `exempt_base` skalerindedir.
    // Döngüden ÖNCE liste doluluğu ölçülür — boş dizi üzerinde dönen bir
    // `for` hiçbir şey kanıtlamaz (aynı sınıf kusur T4'te de kapatıldı).
    expect(vat.taxable_rows.length).toBeGreaterThan(0);
    for (const row of vat.taxable_rows) {
      expect(Number(row.rate)).toBeGreaterThan(0);
    }
    expect(Number(vat.exempt_base)).toBeGreaterThan(0);
    // Sunucu TEK indirim satırı döner (`Alışlar`) — mockup'ın Mal/Hizmet
    // ayrımının veri modelinde karşılığı YOKTUR.
    expect(vat.deductions.map((row) => row.source)).toEqual(["Alışlar"]);
  });

  /**
   * 🔴 KDV FİKSTÜRÜ MUTASYONDAN BAĞIMSIZDIR (T5 kararının bekçisi).
   *
   * KDV ekranının varsayılan dönemi ÖNCEKİ AYDIR ve okuma saatinde bu
   * HAZİRAN'a düşer — tam da yazma akışlarının koştuğu MUTASYON ADASI.
   * Fikstür `accountingState`ten türetilseydi bir "fiş oluştur" akışı KDV
   * karesini `fullyParallel` altında sessizce oynatırdı ve neden bulunamazdı.
   *
   * Bu test, fikstürü mock backend'de `accountingState`e bağlayan bir
   * değişiklikte KIRMIZI olur.
   */
  test("KDV fikstürü HAZİRAN mutasyonlarından etkilenmez", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const before = await (await page.request.get("/api/backend/vat-return?year=2026&month=6")).text();

    // Haziran adasına GERÇEK bir fiş yazılır (dengeli, iki bacaklı).
    // 🔴 Bacaklardan biri KDV HESABINA (391 Hesaplanan KDV) düşer. Yalnız
    // Kasa/Satışlar kullanılsaydı, `vatReturnFixture`ı `accountingState`e
    // bağlayan en DOĞAL regresyon (beyanı 191/391 satırlarından türetmek) bu
    // yanıtı hiç oynatmaz ve bekçi YEŞİL kalırdı — mutasyon kanıtı sahte
    // olurdu.
    const created = await page.request.post("/api/backend/journal-entries", {
      data: {
        entry_date: "2026-06-19",
        description: "MUT · KDV fikstür bağımsızlık ölçümü",
        lines: [
          { account_id: "coa-100", debit: "1200000", credit: "0" },
          { account_id: "coa-600", debit: "0", credit: "1000000" },
          { account_id: "coa-391", debit: "0", credit: "200000" },
        ],
      },
    });
    expect(created.status()).toBe(201);

    const after = await (await page.request.get("/api/backend/vat-return?year=2026&month=6")).text();
    // BİREBİR aynı gövde — tek bir kuruş bile oynamaz.
    expect(after).toBe(before);
  });
});

test.describe("Mizan ekranı (MZ)", () => {
  test("dolu dönem: sekiz sütun, GENEL TOPLAM ve DENGE banner'ı basılır", async ({ page }) => {
    await openTrialBalance(page);

    await expect(page.getByRole("heading", { level: 1, name: "Mizan" })).toBeVisible();
    // 🔴 Dönem etiketi BİRİKİMLİ ARALIKTIR (MZ:45), tek ay değil.
    await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak–Temmuz 2026");

    const table = page.getByRole("region", { name: "Mizan" });
    await expect(table.locator("tbody tr")).toHaveCount(9);
    // Dönem BRÜT satırı (iki taraf da dolu) gerçekten kadrajda.
    await expect(page.getByTestId("mz-row-100")).toContainText("2.640.000");
    await expect(page.getByTestId("mz-row-100")).toContainText("2.535.200");
    // Kapanış ALACAK dalı da (yeşil) kadrajda.
    await expect(page.getByTestId("mz-row-320")).toContainText("2.184.000");

    await expect(page.getByTestId("mz-banner")).toContainText("Mizan Dengede");
    await expect(page.getByTestId("mz-totals")).toContainText("GENEL TOPLAM");
    await expect(page.getByTestId("mz-totals")).toContainText("27.466.500");

    // Devre-dışı düğmeler ve GÖRÜNÜR gerekçe.
    await expect(page.getByTestId("mz-export-excel")).toBeDisabled();
    await expect(page.getByTestId("mz-export-pdf")).toBeDisabled();
    await expect(page.getByTestId("mz-export-reason")).toBeVisible();
  });

  test("🔴 DENGESİZ dönem: banner tonu döner ve fark basılır (K2)", async ({ page }) => {
    await openTrialBalance(page, ACCOUNTING_EMPTY_TIME);

    await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak 2026");
    const banner = page.getByTestId("mz-banner");
    await expect(banner).toHaveClass(/mu-banner--off/);
    await expect(banner).toContainText("Mizan Dengede Değil");
    // |140.000 − 280.000| = 140.000
    await expect(banner).toContainText("fark: ₺ 140.000");
  });

  test("`›` ileri gidince veri BOŞ gelir — üst sınır YOKTUR (K4)", async ({ page }) => {
    await openTrialBalance(page);
    await page.getByTestId("mu-period-next").click();
    await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak–Ağustos 2026");
    // Ağustos'ta fikstür yok ⇒ boş durum metni; hata DEĞİL.
    await expect(page.getByTestId("mz-empty")).toBeVisible();
    await expect(page.getByTestId("mz-error")).toHaveCount(0);
  });

  test("modül şeridinde Mizan artık AKTİF bir bağlantıdır", async ({ page }) => {
    await openTrialBalance(page);
    // 🔴 F-MUP: drill-in sidebar KALKTI (KK-10), yerini MP:105-112 hap
    // şeridi aldı. İddia SİLİNMEDİ, yeni yüzeye TAŞINDI.
    const tabs = page.getByTestId("mu-tabs");
    const active = tabs.getByRole("link").and(page.locator("[aria-current='page']"));
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("Mizan");
  });
});

test.describe("KDV Beyannamesi ekranı", () => {
  test("ödenecek dalı: üç kart, iki tablo, sonuç şeridi ve UZUN tarih", async ({ page }) => {
    await openVatReturn(page);

    await expect(page.getByRole("heading", { level: 1, name: "KDV Beyannamesi" })).toBeVisible();
    // 🔴 K4 — beyanname ÖNCEKİ ayındır: Temmuz saatinde HAZİRAN gösterilir.
    await expect(page.getByTestId("mu-period-label")).toHaveText("Haziran 2026");

    await expect(page.getByTestId("kdv-card-calculated")).toContainText("₺ 924.000");
    await expect(page.getByTestId("kdv-card-deductible")).toContainText("₺ 412.000");
    await expect(page.getByTestId("kdv-card-outcome")).toHaveClass(/mu-vat-card--payable/);
    await expect(page.getByTestId("kdv-outcome-amount")).toContainText("₺ 512.000");
    await expect(page.getByTestId("kdv-card-outcome")).toContainText("Vade: 28.07.2026");

    // 🔴 `İşlem` sütunu ORANDAN türer; mockup'ın sınıflandırması uydurulmaz.
    await expect(page.getByTestId("kdv-taxable-rate-20.00")).toContainText("%20 oranlı teslimler");
    await expect(page.getByTestId("kdv-taxable-rate-10.00")).toContainText("%10 oranlı teslimler");
    // 🔴 İstisna satırı `exempt_base`ten kurulur ve toplama DÂHİLdir:
    // 4.120.000 + 1.000.000 + 500.000 = 5.620.000
    await expect(page.getByTestId("kdv-taxable-exempt")).toContainText("İstisna İşlemler");
    await expect(page.getByTestId("kdv-taxable-base-total")).toHaveText("5.620.000");

    // 🔴 Sunucu TEK indirim satırı döner; mockup'ın iki satırı BASILMAZ.
    await expect(page.locator('[data-testid^="kdv-deduction-"]:not([data-testid$="total"])')).toHaveCount(1);
    await expect(page.getByTestId("kdv-deduction-base-total")).toHaveText("2.060.500");

    const result = page.getByTestId("kdv-result");
    await expect(result).toHaveClass(/mu-vat-result--payable/);
    await expect(result).toContainText("Ödenecek KDV (924.000 – 412.000)");
    await expect(page.getByTestId("kdv-result-date")).toHaveText(
      "Son ödeme tarihi: 28 Temmuz 2026",
    );

    await expect(page.getByTestId("kdv-xml")).toBeDisabled();
    await expect(page.getByTestId("kdv-send")).toBeDisabled();
    await expect(page.getByTestId("kdv-send-reason")).toBeVisible();
  });

  test("🔴 DEVREDEN dalı: başlık, ton ve aritmetik döner, tarih satırı YOK (K1)", async ({
    page,
  }) => {
    await openVatReturn(page, ACCOUNTING_VAT_CARRIED_TIME);

    await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak 2026");
    const card = page.getByTestId("kdv-card-outcome");
    await expect(card).toHaveClass(/mu-vat-card--carried/);
    await expect(card).toContainText("Devreden KDV");
    await expect(card).toContainText("Gelecek döneme devreder");
    await expect(page.getByTestId("kdv-outcome-amount")).toContainText("₺ 340.000");

    const result = page.getByTestId("kdv-result");
    await expect(result).toHaveClass(/mu-vat-result--carried/);
    // Aritmetik TERS yazılır (B − A).
    await expect(result).toContainText("Devreden KDV (520.000 – 180.000)");
    await expect(page.getByTestId("kdv-result-date")).toHaveCount(0);

    // 🔴 K7 — bu ekranda sıfır `0` yazılır, `—` DEĞİL (Mizan'ın TERSİ).
    await expect(page.getByTestId("kdv-taxable-exempt")).toContainText("0");
  });

  test("modül şeridinde KDV Beyanı artık AKTİF bir bağlantıdır", async ({ page }) => {
    await openVatReturn(page);
    // 🔴 F-MUP: drill-in sidebar KALKTI (KK-10), yerini MP:105-112 hap
    // şeridi aldı. İddia SİLİNMEDİ, yeni yüzeye TAŞINDI.
    const tabs = page.getByTestId("mu-tabs");
    const active = tabs.getByRole("link").and(page.locator("[aria-current='page']"));
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("KDV Beyanı");
  });
});
