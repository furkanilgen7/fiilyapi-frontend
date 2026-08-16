import { test, expect } from "@playwright/test";

import {
  ACCOUNTING_READ_TIME,
  ACCOUNTING_URL,
  CHART_OF_ACCOUNTS_URL,
  loginAt,
  openAccounting,
  openChartOfAccounts,
} from "./accounting-helpers";

// F-MU1 T5 · Muhasebe ekranlarının FONKSİYONEL e2e'si — görsel spec AYRI
// dosyadadır (T6). Bu dosyanın adında "gorsel" GEÇMEZ ki beşinci kapıda koşsun.
//
// ⚠️ `getByRole("alert")` KULLANILMAZ (F-P6 dersi): akış-SSR ikinci bir kopya
// bastığında `alert` rolü çift eşleşir ve test YALNIZ Linux CI'da patlar.
//
// 📅 Saat DONDURULUR ve 🔒 yazma akışları AYRI AYA taşınır — gerekçeleri
// `accounting-helpers.ts`te.

test.describe("BFF kökleri (telden)", () => {
  /**
   * 🔴 Üç kök `route.ts` izin listesinde YAZILI ama "zaten var" VARSAYILMAZ:
   * kök listeden düşerse modül YALNIZ CANLIDA 404 alır ve jsdom testleri bunu
   * GÖRMEZ (F-ST/F-MK dersi). Bu yüzden istekler gerçekten telden geçirilir.
   */
  test("chart-of-accounts · journal-entries · journal kökleri BFF'ten geçer", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const chart = await page.request.get("/api/backend/chart-of-accounts?limit=200");
    const entries = await page.request.get("/api/backend/journal-entries?year=2026&month=7&limit=200");
    const ledger = await page.request.get("/api/backend/journal?year=2026&month=7&limit=200");
    const summary = await page.request.get("/api/backend/journal-entries/summary?year=2026&month=7");

    expect(chart.status()).toBe(200);
    expect(entries.status()).toBe(200);
    expect(ledger.status()).toBe(200);
    expect(summary.status()).toBe(200);

    // Türev alanların hepsi SUNUCUDAN gelir (istemci hiçbirini hesaplamaz).
    const chartBody = (await chart.json()) as {
      items: Array<{ code: string; class_code: string; level: number; balance: string }>;
    };
    expect(chartBody.items.length).toBeGreaterThan(0);
    for (const row of chartBody.items) {
      expect(row.class_code).toBe(row.code[0]);
      expect(row.level).toBe(row.code.length === 2 ? 1 : row.code.includes(".") ? 3 : 2);
    }
    // `level` 1/2/3 KARIŞIMI gerçekten fikstürdedir (girinti dalları ölçülür).
    expect(new Set(chartBody.items.map((row) => row.level))).toEqual(new Set([1, 2, 3]));

    const ledgerBody = (await ledger.json()) as {
      items: Array<{ debit: string; credit: string; running_balance: string; entry_status: string }>;
      carried_balance: string;
    };
    // 🔴 Devir SIFIRDAN FARKLIDIR ve koşan bakiye onun ÜSTÜNE kuruludur.
    expect(Number(ledgerBody.carried_balance)).not.toBe(0);
    // Yanıt DESC'tir; kronolojik birikimi görmek için ters çevrilir.
    const ascending = [...ledgerBody.items].reverse();
    let running = Number(ledgerBody.carried_balance);
    for (const row of ascending) {
      running += Number(row.debit) - Number(row.credit);
      expect(Number(row.running_balance)).toBeCloseTo(running, 2);
    }
    // `draft` deftere GİRMEZ, `reversed` GİRER.
    const statuses = new Set(ledgerBody.items.map((row) => row.entry_status));
    expect(statuses.has("draft")).toBe(false);
    expect(statuses.has("reversed")).toBe(true);

    // 🔴 Özet defterle AYNI kümeyi sayar (`summary.py` ≡ `ledger.py`).
    const summaryBody = (await summary.json()) as {
      total_debit: string;
      total_credit: string;
      net_balance: string;
    };
    const debitSum = ledgerBody.items.reduce((sum, row) => sum + Number(row.debit), 0);
    const creditSum = ledgerBody.items.reduce((sum, row) => sum + Number(row.credit), 0);
    expect(Number(summaryBody.total_debit)).toBeCloseTo(debitSum, 2);
    expect(Number(summaryBody.total_credit)).toBeCloseTo(creditSum, 2);
    // `net_balance = ALACAK − BORÇ` (şema notu; yön E8:88'den kanıtlı).
    expect(Number(summaryBody.net_balance)).toBeCloseTo(creditSum - debitSum, 2);
  });

  test("/muhasebe yüklenirken ÜÇ kök de BFF üzerinden çağrılır", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const seen = new Set<string>();
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/backend/")) return;
      seen.add(url.pathname.replace("/api/backend/", "").split("/")[0]);
    });

    await page.goto(ACCOUNTING_URL);
    await expect(page.getByTestId("mu-loaded-ledger")).toBeAttached();
    await expect(page.getByTestId("mu-loaded-drafts")).toBeAttached();
    await expect(page.getByTestId("mu-loaded-accounts")).toBeAttached();

    expect([...seen]).toContain("journal");
    expect([...seen]).toContain("journal-entries");
    expect([...seen]).toContain("chart-of-accounts");
  });

  test("/muhasebe/hesap-plani yüklenirken chart-of-accounts kökü çağrılır", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const seen: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/api/backend/")) seen.push(url.pathname);
    });

    await page.goto(CHART_OF_ACCOUNTS_URL);
    await expect(page.getByTestId("hp-loaded")).toBeAttached();

    expect(seen.some((path) => path === "/api/backend/chart-of-accounts")).toBe(true);
  });

  test("limit tavanı aşılırsa 422 döner (kırpma korkuluğunun kaynağı)", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    expect((await page.request.get("/api/backend/chart-of-accounts?limit=500")).status()).toBe(422);
    expect((await page.request.get("/api/backend/journal?year=2026&month=7&limit=500")).status()).toBe(422);
  });
});

test.describe("drill-in sidebar", () => {
  // 🔴 F-MU2: iddia SİLİNMEDİ, YENİ GERÇEĞE TAŞINDI — Mizan ve KDV Beyanı'nın
  // EKRANLARI açıldı, ikisi de artık gezilebilir bağlantıdır. Devre-dışı
  // kalanlar yalnız Banka Mutabakatı ve e-Fatura'dır (uçları hâlâ yok).
  test("DÖRT sekme gezilebilir; İKİ devre-dışı sekme tıklanamaz ve gerekçesi EKRANDA", async ({
    page,
  }) => {
    await openAccounting(page);

    const sidebar = page.getByRole("complementary", { name: "Muhasebe menüsü" });
    await expect(sidebar.getByRole("link", { name: "Yevmiye Defteri" })).toBeVisible();

    // Gezilebilir sekme: gerçekten rota değiştirir.
    await sidebar.getByRole("link", { name: "Hesap Planı" }).click();
    await expect(page).toHaveURL(/\/muhasebe\/hesap-plani$/);
    await expect(page.getByRole("heading", { level: 1, name: "Hesap Planı" })).toBeVisible();

    // 🔴 F-MU2'nin iki yeni sekmesi de GERÇEKTEN gezilebilir olmalı: link
    // basmak yetmez, catch-all ComingSoon'a düşerse kullanıcı "açıldı" sanılan
    // boş bir ekran görürdü.
    await sidebar.getByRole("link", { name: "Mizan" }).click();
    await expect(page).toHaveURL(/\/muhasebe\/mizan$/);
    await expect(page.getByRole("heading", { level: 1, name: "Mizan" })).toBeVisible();

    await sidebar.getByRole("link", { name: "KDV Beyanı" }).click();
    await expect(page).toHaveURL(/\/muhasebe\/kdv-beyani$/);
    await expect(page.getByRole("heading", { level: 1, name: "KDV Beyannamesi" })).toBeVisible();

    for (const label of ["Banka Mutabakatı", "e-Fatura"]) {
      // 🔴 Devre dışı öğe BİR BAĞLANTI DEĞİLDİR — tıklanabilir bir öğe var
      // olmayan bir yetenek vaat ederdi.
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
      const item = sidebar.locator('[aria-disabled="true"]', { hasText: label });
      await expect(item).toBeVisible();
      // 🔴 Gerekçe DOM METNİDİR, `title` içinde SAKLI DEĞİL.
      const reason = item.locator(".mu-shell-item__reason");
      await expect(reason).toBeVisible();
      await expect(reason).not.toBeEmpty();
      await expect(item).not.toHaveAttribute("title", /.+/);
    }
  });

  /** 🔴 F-SD T7 DERSİ: kök sekme `exact` değilse İKİ öğe birden mavi yanar. */
  test("hesap planındayken aria-current='page' TAM OLARAK BİR öğededir", async ({ page }) => {
    await openChartOfAccounts(page);

    const sidebar = page.getByRole("complementary", { name: "Muhasebe menüsü" });
    await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(sidebar.locator('[aria-current="page"]')).toHaveText("Hesap Planı");

    // Kökte de tek olmalı (oradaki aktif öğe "Yevmiye Defteri"dir).
    await page.goto(ACCOUNTING_URL);
    await expect(page.getByTestId("mu-loaded-ledger")).toBeAttached();
    await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(sidebar.locator('[aria-current="page"]')).toHaveText("Yevmiye Defteri");
  });
});

test.describe("devre-dışı dışa aktarma düğmeleri", () => {
  test("E8:66 'Dışa Aktar' devre dışıdır ve gerekçesi EKRANDA basılır", async ({ page }) => {
    await openAccounting(page);

    await expect(page.getByTestId("mu-export")).toBeDisabled();
    await expect(page.getByTestId("mu-export-reason")).toBeVisible();
    await expect(page.getByTestId("mu-export-reason")).not.toBeEmpty();
  });

  test("HP:49 'Excel' devre dışıdır ve gerekçesi EKRANDA basılır", async ({ page }) => {
    await openChartOfAccounts(page);

    await expect(page.getByTestId("hp-export")).toBeDisabled();
    await expect(page.getByTestId("hp-export-reason")).toBeVisible();
    await expect(page.getByTestId("hp-export-reason")).not.toBeEmpty();
  });
});

test.describe("yevmiye defteri ekranı (SALT-OKUR)", () => {
  test("defter SATIR bazlıdır; devir şeridi ve KPI'lar sunucudan basılır", async ({ page }) => {
    await openAccounting(page);

    // E8:74 — dönem başlığı dondurulmuş takvimden gelir.
    await expect(page.getByTestId("mu-period-label")).toHaveText("Temmuz 2026");

    // 🔴 Devir şeridi: `carried_balance` sıfır değil → GÖRÜNÜR.
    await expect(page.getByTestId("mu-carried-balance")).toBeVisible();

    const ledger = page.getByRole("region", { name: "Yevmiye Defteri" });
    await expect(ledger.getByText("Hakediş Tahsilatı – Güneşkent")).toBeVisible();
    // Aynı fişin `reversed` satırı DEFTERDE KALIR (istemci yeniden süzmez).
    await expect(ledger.getByText("Taşeron Ödemesi – Akın İnşaat")).toBeVisible();
    // E8:113 — ikinci satır serbest metin nottur.
    await expect(ledger.getByText("Ziraat Bank · TRF-20260717")).toBeVisible();

    await expect(page.getByTestId("mu-kpi-debit")).toBeVisible();
    await expect(page.getByTestId("mu-kpi-credit")).toBeVisible();
    await expect(page.getByTestId("mu-kpi-net")).toBeVisible();
  });

  test("hesap süzgeci SUNUCUYA gider; seçilen hesabın dışı tabloda kalmaz", async ({ page }) => {
    await openAccounting(page);

    const ledger = page.getByRole("region", { name: "Yevmiye Defteri" });
    await expect(ledger.getByText("Bordro – Temmuz İşçilik")).toBeVisible();

    // `120.01 Yurtiçi Alıcılar` — E8:112/148'in hesabı.
    await page.getByTestId("mu-account-filter").selectOption("coa-120.01");

    await expect(ledger.getByText("Hakediş Tahsilatı – Güneşkent")).toBeVisible();
    await expect(ledger.getByText("Bordro – Temmuz İşçilik")).toHaveCount(0);
  });

  /** 🔴 T5 BULGUSU'nun bekçisi: `posted` fiş ekranda GÖRÜNÜR olmalıdır. */
  test("dönem fişleri paneli üç durumu da gösterir (yalnız taslakları DEĞİL)", async ({ page }) => {
    await openAccounting(page);

    const panel = page.getByRole("region", { name: "Dönem Fişleri" });
    await expect(panel.getByTestId("mu-draft-row-je-2607-draft-1")).toBeVisible();
    await expect(panel.getByTestId("mu-draft-row-je-2607-post-1")).toBeVisible();
    await expect(panel.getByTestId("mu-draft-row-je-2607-rev-1")).toBeVisible();
  });

  /**
   * 🔴 YÖNETİM KARARI 2 — uçtan uca. `posted` fişte düzenle/sil HİÇ SUNULMAZ
   * (sunucu 409 verirdi); yalnız Storno sunulur. `reversed` TERMİNALDİR.
   */
  test("posted fişte Düzenle/Sil YOK, Storno VAR; reversed fişte hiçbiri yok", async ({ page }) => {
    await openAccounting(page);

    await expect(page.getByTestId("mu-draft-edit-je-2607-post-1")).toHaveCount(0);
    await expect(page.getByTestId("mu-draft-delete-je-2607-post-1")).toHaveCount(0);
    await expect(page.getByTestId("mu-draft-post-je-2607-post-1")).toHaveCount(0);
    await expect(page.getByTestId("mu-draft-reverse-je-2607-post-1")).toBeVisible();

    await expect(page.getByTestId("mu-draft-edit-je-2607-rev-1")).toHaveCount(0);
    await expect(page.getByTestId("mu-draft-delete-je-2607-rev-1")).toHaveCount(0);
    await expect(page.getByTestId("mu-draft-reverse-je-2607-rev-1")).toHaveCount(0);

    // Taslakta tersi: Düzenle + Kayıtlaştır + Sil var, Storno YOK.
    await expect(page.getByTestId("mu-draft-edit-je-2607-draft-1")).toBeVisible();
    await expect(page.getByTestId("mu-draft-post-je-2607-draft-1")).toBeVisible();
    await expect(page.getByTestId("mu-draft-delete-je-2607-draft-1")).toBeVisible();
    await expect(page.getByTestId("mu-draft-reverse-je-2607-draft-1")).toHaveCount(0);
  });
});

test.describe("hesap planı ekranı (SALT-OKUR)", () => {
  test("sınıf bantları · girinti · negatif bakiye · pasif nokta birlikte basılır", async ({
    page,
  }) => {
    await openChartOfAccounts(page);

    // Bantlar `class_code`ten TÜRER (sunucu alanı değildir).
    await expect(page.getByTestId("hp-class-1")).toHaveText("SINIF 1 — DÖNEN VARLIKLAR");
    await expect(page.getByTestId("hp-class-2")).toHaveText("SINIF 2 — DURAN VARLIKLAR");
    await expect(page.getByTestId("hp-class-3")).toHaveText("SINIF 3 — KISA VADELİ YÜKÜMLÜLÜKLER");

    // Grup satırı (level 1) ile veri satırı (level ≥ 2) AYRI basılır.
    await expect(page.getByTestId("hp-group-10")).toBeVisible();
    await expect(page.getByTestId("hp-row-100")).toBeVisible();
    await expect(page.getByTestId("hp-row-120.01")).toBeVisible();

    // 🔴 HP:155 — negatif bakiye PARANTEZ içinde (eksi işaretiyle DEĞİL).
    await expect(page.getByTestId("hp-balance-257")).toHaveText("(620.000)");
    // `Tür` (rozet) ile `Durum` (nokta) AYRI şeylerdir: 257 türü Pasif, noktası KULLANIMDA.
    await expect(page.getByTestId("hp-type-257")).toHaveText("Pasif");
    await expect(page.getByTestId("hp-status-257")).toHaveAttribute("aria-label", "Kullanımda");

    // 🔴 Tek pasif hesap: türü `Aktif` (asset) ama noktası KULLANIM DIŞI.
    await expect(page.getByTestId("hp-type-108")).toHaveText("Aktif");
    await expect(page.getByTestId("hp-status-108")).toHaveAttribute("aria-label", "Kullanım dışı");
  });

  /**
   * 🔴 K5 — `is_contra`nın EKRANDAKİ tek görünür sonucu 5. kapıda bekçilenir.
   * Bayrak forma eklendi (K6/K7) ama liste onu okumazsa kullanıcı yanlış
   * işaretlediğini göremez ve yanlış işaretlenmiş hesabı listede BULAMAZ.
   */
  test("🔴 K5: kontra hesap ROZETLE işaretlenir, kontra olmayan satırda rozet YOK", async ({
    page,
  }) => {
    await openChartOfAccounts(page);

    // Tohumun TEK kontra hesabı (`257`, `isContra: true`).
    const rozet = page.getByTestId("hp-contra-257");
    await expect(rozet).toBeVisible();
    await expect(rozet).toHaveText("(-)");
    // Renk/sembol tek başına bilgi taşımaz → okunur ad ZORUNLU.
    await expect(rozet).toHaveAttribute("aria-label", "Kontra hesap");

    // Komşu hesap (`254`, aynı sınıf, kontra DEĞİL) işaretsizdir — aksi halde
    // rozet bilgi taşımayan bir süs olurdu.
    await expect(page.getByTestId("hp-contra-254")).toHaveCount(0);
    // Bütün listede TEK rozet vardır.
    await expect(page.getByLabel("Kontra hesap")).toHaveCount(1);
  });

  test("arama SUNUCUYA gider; eşleşmeyen satırlar tablodan düşer", async ({ page }) => {
    await openChartOfAccounts(page);

    await expect(page.getByTestId("hp-row-100")).toBeVisible();
    await page.getByTestId("hp-search").fill("Satıcılar");

    await expect(page.getByTestId("hp-row-320.04")).toBeVisible();
    await expect(page.getByTestId("hp-row-100")).toHaveCount(0);
  });
});
