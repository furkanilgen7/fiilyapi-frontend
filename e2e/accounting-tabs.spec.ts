import { test, expect } from "@playwright/test";

import {
  ACCOUNTING_READ_TIME,
  ACCOUNTING_URL,
  BANK_RECONCILIATION_URL,
  loginAt,
  openAccounting,
  openBankReconciliation,
} from "./accounting-helpers";

// F-MUP · `Muhasebe - Profesyonel` (MP) düzeninin + Banka Mutabakatı
// ekranının FONKSİYONEL e2e'si. Görsel kadrajlar AYRI dosyadadır; bu dosyanın
// adında "gorsel" GEÇMEZ ki beşinci kapıda koşsun.
//
// ⚠️ `getByRole("alert")` KULLANILMAZ (F-P6 dersi).
// 🔒 SALT-OKUR: hiçbir POST/PATCH/DELETE tetiklenmez.

test.describe("BFF kökleri (telden) — F-MUP'un YENİ bağımlılıkları", () => {
  /**
   * 🔴 MP:114-139 KPI şeridi `/vat-return`e, MP:165-209 sağ rayı
   * `/trial-balance`e bağlandı. İki kök `route.ts` izin listesinde YAZILI ama
   * "zaten var" VARSAYILMAZ: kök listeden düşerse `/muhasebe` kökü YALNIZ
   * CANLIDA yarım iner ve jsdom testleri bunu GÖRMEZ (F-ST/F-MK dersi).
   */
  test("trial-balance ve vat-return kökleri BFF'ten geçer", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const trial = await page.request.get("/api/backend/trial-balance?year=2026&month=7");
    const vat = await page.request.get("/api/backend/vat-return?year=2026&month=6");

    expect(trial.status()).toBe(200);
    expect(vat.status()).toBe(200);
  });
});

test.describe("MP:105-112 modül sekmeleri", () => {
  test("yedi sekme basılır; e-Fatura bağlantı DEĞİLdir ve gerekçesi ekrandadır", async ({
    page,
  }) => {
    await openAccounting(page);

    const tabs = page.getByTestId("mu-tabs");
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Yevmiye", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Devre dışı sekme SİLİNMEZ ama tıklanabilir DEĞİLDİR.
    await expect(tabs.getByRole("link", { name: "e-Fatura" })).toHaveCount(0);
    await expect(tabs.getByText("e-Fatura", { exact: true })).toBeVisible();
    await expect(page.getByTestId("mu-tabs-reason")).toContainText("ertelendi");
  });

  test("🔴 sekmeler GERÇEKTEN gezinir ve her yolda TEK hap aktiftir", async ({ page }) => {
    await openAccounting(page);

    // Rotası olmayan bir sekme catch-all ComingSoon'a düşerdi; bu tur
    // `banka-mutabakati`yi LİNK'e çevirdiği için kritik olan odur.
    await page.getByTestId("mu-tabs").getByRole("link", { name: "Banka Mutabakatı" }).click();
    await expect(page).toHaveURL(new RegExp(`${BANK_RECONCILIATION_URL}$`));
    await expect(page.getByRole("heading", { name: "Banka Mutabakatı" })).toBeVisible();

    const active = page.getByTestId("mu-tabs").locator('[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("Banka Mutabakatı");

    // Geri dönüş: kök `exact` olduğu için alt yolda YANMAMIŞ olmalı.
    await page.getByTestId("mu-tabs").getByRole("link", { name: "Mizan" }).click();
    await expect(page.getByRole("heading", { name: "Mizan" })).toBeVisible();
    await expect(page.getByTestId("mu-tabs").locator('[aria-current="page"]')).toHaveText(
      "Mizan",
    );
  });
});

test.describe("MP:114-209 KPI şeridi ve sağ ray — SUNUCUDAN", () => {
  test("beş kart iner; KDV kartı ÖNCEKİ ayın beyanını gösterir", async ({ page }) => {
    await openAccounting(page);

    await expect(page.getByTestId("mu-kpi-debit")).toContainText("Toplam Borç");
    await expect(page.getByTestId("mu-kpi-credit")).toContainText("Toplam Alacak");
    await expect(page.getByTestId("mu-kpi-net")).toContainText("Net Bakiye");
    // 🔴 Sayfa Temmuz 2026'da; vade İZLEYEN ayın 28'i olduğu için
    // `28 Tem` HAZİRAN beyanınındır (MP:104 ↔ MP:131 ölçümü).
    await expect(page.getByTestId("mu-kpi-vat-due")).toContainText("Haziran 2026 beyanı");
    await expect(page.getByTestId("mu-kpi-vat-due")).toContainText("28 Tem vadeli");
    // Ucu OLMAYAN kart: SİLİNMEZ, sayı UYDURULMAZ, gerekçe EKRANDA.
    await expect(page.getByTestId("mu-kpi-einvoice")).toContainText("e-Fatura Bekleyen");
    await expect(page.getByTestId("mu-kpi-einvoice-reason")).toBeVisible();
  });

  test("sağ ray mizandan iner ve satır sayısını YAZAR", async ({ page }) => {
    await openAccounting(page);

    const rail = page.getByTestId("mu-rail-list");
    await expect(rail).toBeVisible();
    await expect(page.getByTestId("mu-rail-count")).toContainText("hesap");
    // e-Fatura paneli SİLİNMEZ ama SAHTE SATIR basmaz (MP:212-238'in üç
    // örnek satırı ekrana çıkarsa kullanıcı onları gerçek veri sanar).
    await expect(page.getByTestId("mu-einvoice-reason")).toBeVisible();
    await expect(page.getByText("Yılmaz Elektrik")).toHaveCount(0);
    await expect(page.getByText("GİB Bekliyor")).toHaveCount(0);
  });

  test("defter altı dönem toplamları KPI kartlarıyla AYNI sayıyı basar", async ({ page }) => {
    await openAccounting(page);

    // Tek kaynak (`journal-summary`) — iki yüzey ayrışamaz.
    const debit = await page.getByTestId("mu-kpi-debit").innerText();
    const totals = await page.getByTestId("mu-ledger-totals").innerText();
    const amount = debit.split("\n").at(-1)?.trim() ?? "";
    expect(amount.length).toBeGreaterThan(0);
    expect(totals).toContain(amount);
  });
});

test.describe("Banka Mutabakatı — CANLI yarı / ÖLÜ yarı", () => {
  test("ölü yarı devre dışıdır ve mockup'ın sahte satırları BASILMAZ", async ({ page }) => {
    await openBankReconciliation(page);

    await expect(page.getByTestId("bm-run")).toBeDisabled();
    await expect(page.getByTestId("bm-import")).toBeDisabled();
    await expect(page.getByTestId("bm-statement-reason")).toBeVisible();
    await expect(page.getByTestId("bm-card-statement-reason")).toBeVisible();
    await expect(page.getByTestId("bm-card-diff-reason")).toBeVisible();
    // 🔴 Bu ekranın verebileceği EN PAHALI yalan: mutabakat koşmamışken
    // "✓ Mutabık" basmak.
    await expect(page.getByText("Mutabık")).toHaveCount(0);
    await expect(page.getByText("Güneşkent")).toHaveCount(0);
  });

  test("hesap seçilince defter ve kapanış bakiyesi SUNUCUDAN iner", async ({ page }) => {
    await openBankReconciliation(page);

    // Seçilmeden önce defter YOKTUR (süzgeçsiz `/journal` TÜM hesapları
    // döndürürdü ve ekran onları "102 hareketleri" diye basardı).
    await expect(page.getByTestId("bm-ledger-idle")).toBeVisible();

    const select = page.getByTestId("bm-account");
    const values = await select.locator("option").evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLOptionElement).value).filter((v) => v.length > 0),
    );
    // Hesap planında 102 ile başlayan en az bir hesap olmalı; yoksa ekran
    // bunu GEREKÇESİYLE söyler ve bu test o gerekçeyi ölçer.
    if (values.length === 0) {
      await expect(page.getByTestId("bm-no-bank-accounts")).toBeVisible();
      return;
    }

    await select.selectOption(values[0]!);
    await expect(page.getByTestId("bm-ledger-idle")).toHaveCount(0);
    await expect(page.getByTestId("bm-ledger-title")).toContainText("102");
    await expect(page.getByTestId("bm-closing")).toContainText("Kapanış Bakiyesi");
  });

  test("`← Muhasebe` kökten geri döner", async ({ page }) => {
    await openBankReconciliation(page);
    await page.getByTestId("bm-back").click();
    await expect(page).toHaveURL(new RegExp(`${ACCOUNTING_URL}$`));
  });
});
