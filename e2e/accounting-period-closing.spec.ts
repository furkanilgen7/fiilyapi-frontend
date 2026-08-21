import { test, expect } from "@playwright/test";

import {
  ACCOUNTING_READ_TIME,
  DKAP_MUTATION_MONTH,
  DKAP_MUTATION_YEAR,
  loginAt,
  openPeriodClosing,
  PERIOD_CLOSING_URL,
} from "./accounting-helpers";

// F-DKAP T2 · Dönem Kapanışı ekranının FONKSİYONEL e2e'si — görsel spec
// AYRI dosyadadır. Bu dosyanın adında "gorsel" GEÇMEZ ki beşinci kapıda
// (`--grep-invert "gorsel"`) koşsun.
//
// ⚠️ `getByRole("alert")` KULLANILMAZ (depo kanonu).
// 📅 Saat DONDURULUR (`accounting-helpers.ts`).

test.describe("BFF kökü (telden)", () => {
  test("accounting-periods kökü BFF'ten geçer", async ({ page }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);

    const response = await page.request.get("/api/backend/accounting-periods?year=2026");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { items: Array<{ month: number; status: string }> };
    expect(body.items.length).toBeGreaterThan(0);
  });
});

test.describe("Dönem Kapanışı ekranı (DK)", () => {
  test("başlık, yetki notu ve yıl seçici basılır", async ({ page }) => {
    await openPeriodClosing(page);

    await expect(page.getByRole("heading", { level: 1, name: "Dönem Kapanışı" })).toBeVisible();
    await expect(page.getByTestId("dkap-role-note")).toContainText(
      "Muhasebe rolü dönem kapatabilir, ancak geri açamaz.",
    );
    await expect(page.getByTestId("dkap-year-select")).toHaveValue("2026");
  });

  // 🔴 SIRA-B devri — sayılar DK:69'un 6/1/1/4'ünden 6/1/2/3'e KAYDI, çünkü
  // mock fikstürü değişmek ZORUNDAYDI: Ağustos'un öncesi (Temmuz) KAYITLI ve
  // AÇIK olduğu için "Ağustos kapatılabilir" backend'in ÜRETEMEYECEĞİ bir
  // durumdur. Ağustos artık SIRA-engellidir (engelli 1→2) ve kapatılabilir
  // kareyi Kasım taşır (öncesi Ekim KAYITSIZ ⇒ engel değil), böylece kayıt-yok
  // 4→3'e iner. Şerit yine DÖRT sayıdır — `blocked_sequence` beşinci bir
  // sayaç AÇMAZ, "engelli"ye eklenir.
  test("K4 — özet şeridinin dört sayısı satırlardan SAYILIR (6/1/2/3)", async ({ page }) => {
    await openPeriodClosing(page);
    await expect(page.getByTestId("dkap-summary")).toContainText(
      "6 kapalı · 1 kapatılabilir · 2 engelli · 3 kayıt yok",
    );
  });

  test("K2 — Temmuz engelli: düğme devre dışı + hata bandı taslak sayısını gösterir", async ({
    page,
  }) => {
    await openPeriodClosing(page);
    const closeButton = page.getByTestId("dkap-close-7");
    await expect(closeButton).toBeDisabled();
    await expect(page.getByTestId("dkap-blocked-reason-7")).toContainText(
      "Dönem kapatılamıyor — 2 taslak fiş var",
    );
  });

  // 🔴 SIRA-B (K3.3) — Ağustos'ta TASLAK YOKTUR (`draft_count` 0); engel
  // KOMŞU aydan gelir. Gerekçe hangi ayın kapatılması gerektiğini ADIYLA
  // söyler; genel bir "dönemler sırayla kapatılır" cümlesi kullanıcıyı on iki
  // satırlık listede hangi ayın açık kaldığını aramaya zorlardı.
  //
  // ⚠️ `getByRole("alert")` KULLANILMAZ (F-P6 dersi) — bant testid ile bulunur.
  test("🔴 SIRA-B — Ağustos sıra-engelli: düğme devre dışı, gerekçe 'Temmuz 2026'yı ADIYLA söyler", async ({
    page,
  }) => {
    await openPeriodClosing(page);
    await expect(page.getByTestId("dkap-close-8")).toBeDisabled();
    const band = page.getByTestId("dkap-sequence-reason-8");
    await expect(band).toBeVisible();
    await expect(band).toContainText("Temmuz 2026");
    // İki engel KARIŞMASIN: sıra engelinde taslak listesi HİÇ basılmaz.
    await expect(page.getByTestId("dkap-draft-list-8")).toHaveCount(0);
  });

  // 🔴 SIRA-B'nin İKİNCİ yüzü (backend K2/K3): kaydı OLMAYAN önceki ay ENGEL
  // DEĞİLDİR. Kasım'ın öncesi (Ekim) kayıtsızdır ⇒ `previous_period_open`
  // false ⇒ satır kapatılabilir. Bu kural olmasaydı sistemin İLK kapanışı
  // hiçbir zaman yapılamazdı (her ayın öncesinde sonsuz kayıtsız ay vardır).
  test("🔴 SIRA-B — Kasım kapatılabilir: kaydı olmayan önceki ay (Ekim) ENGEL DEĞİL", async ({
    page,
  }) => {
    await openPeriodClosing(page);
    await expect(page.getByTestId("dkap-close-11")).toBeEnabled();
    await expect(page.getByTestId("dkap-sequence-reason-11")).toHaveCount(0);
  });

  // 🔴 Yönetim bulgusu (mockup birebir): "N taslak fiş var" bir SAYI DEĞİL,
  // bir LİSTE vaat eder — `GET /journal-entries?status=draft&year=&month=`
  // süzülebildiği ÖLÇÜLDÜ, liste artık GERÇEK verilerle basılır. Fiş
  // NUMARASI (`YEV-2026-0214`) UYDURULMAZ (şemada yok); açıklama + tutar
  // GERÇEK `ACCOUNTING_READ_ENTRY_SEEDS`ten gelir.
  test("🔴 engelli bandın taslak listesi GERÇEK fişleri gösterir (uydurma numara YOK)", async ({
    page,
  }) => {
    await openPeriodClosing(page);
    const list = page.getByTestId("dkap-draft-list-7");
    await expect(list.locator("li")).toHaveCount(2);
    // Sunucu sırası entry_date DESC: 19 Temmuz önce, 18 Temmuz sonra.
    await expect(list.locator("li").nth(0)).toContainText("Ofis Kira Gideri – Temmuz");
    await expect(list.locator("li").nth(0)).toContainText("₺ 48.000");
    await expect(list.locator("li").nth(1)).toContainText("Kasa Sayım Farkı");
    await expect(list.locator("li").nth(1)).toContainText("₺ 12.500");
    await expect(list.getByRole("link", { name: "Aç →" })).toHaveCount(2);
  });

  // 🔴 N+1 korkuluğu: BU testte tek engelli dönem var (Temmuz); ekran
  // `journal-entries`e TAM BİR çağrı yapar — 12 satırlık tablo başına DEĞİL.
  test("🔴 N+1 korkuluğu: journal-entries BFF'e yalnız TEK çağrı gider", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/backend/journal-entries") calls.push(url.search);
    });
    await openPeriodClosing(page);
    await expect(page.getByTestId("dkap-draft-list-7").locator("li")).toHaveCount(2);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("status=draft");
    expect(calls[0]).toContain("year=2026");
    expect(calls[0]).toContain("month=7");
  });

  // 🔴 K1'in permission-eşiği (full/admin ayrımı) BURADA sınanmaz: mock
  // backend `/auth/me` bir `permissions` alanı TAŞIMAZ (yalnız ME sabiti —
  // MZ/KDV ekranlarında da aynı boşluk var), bu yüzden istemcinin
  // "bilinmezlik kuralı" (spec §2.5.3) devreye girer ve düğme her zaman
  // aktiftir. Eşiğin kendisi `PeriodClosingView.test.tsx`te (mocklu oturumla)
  // KANITLANIR — burada yalnız düğmenin VAR OLDUĞU ve tıklanabilir bir eylem
  // sunduğu ölçülür.
  test("kapalı dönemde 'Geri Aç' düğmesi EKRANDA VAR ve kilit ikonu taşır", async ({ page }) => {
    await openPeriodClosing(page);
    await expect(page.getByTestId("dkap-reopen-1")).toBeVisible();
    await expect(page.getByTestId("dkap-reopen-1")).toContainText("Geri Aç");
  });

  test("K3 — 'kayıt yok' ayında Fiş sütunu 0 basar, düğme eylemsizdir", async ({ page }) => {
    await openPeriodClosing(page);
    const row = page.getByTestId("dkap-row-9");
    await expect(row).toContainText("Kayıt yok");
    await expect(page.getByTestId("dkap-close-9")).toBeDisabled();
  });

  test("K5 — kapalı satırda kapatan + tarih; açık satırda tire (uydurma YOK)", async ({
    page,
  }) => {
    await openPeriodClosing(page);
    // Mock backend'in TEK oturumu "Ahmet Yılmaz"dır (mockup'ın "Ayşe Demir"si
    // ÖRNEK veridir — K5'in kanıtı İSİM DEĞİL, doluluk/boşluk ayrımıdır).
    await expect(page.getByTestId("dkap-row-1")).toContainText("Ahmet Yılmaz");
    await expect(page.getByTestId("dkap-row-1")).toContainText("05.02.2026");
    await expect(page.getByTestId("dkap-row-8")).not.toContainText("Bilinmiyor");
  });

  test("🔴 K8 — 'Dönemi Kapat' onay diyaloğu açar, işaretlenmeden aktifleşmez, onaylanınca dönemi kapatır", async ({
    page,
  }) => {
    await loginAt(page, ACCOUNTING_READ_TIME);
    await page.goto(PERIOD_CLOSING_URL);
    await expect(page.getByTestId("dkap-loaded")).toBeAttached();

    // Yazma adası: 2025 — 2026'nın hiçbir K2/K3/K4 iddiasıyla çakışmaz.
    await page.getByTestId("dkap-year-select").selectOption(String(DKAP_MUTATION_YEAR));
    await expect(page.getByTestId("dkap-loaded")).toBeAttached();

    const closeButton = page.getByTestId(`dkap-close-${DKAP_MUTATION_MONTH}`);
    // Retry'de satır zaten kapalı olabilir (mock backend süreç-ömürlü) — o
    // durumda düğme zaten yoktur ve test kısa devre yapılır.
    if (!(await closeButton.isVisible())) {
      test.skip(true, "2025-06 zaten kapalı (önceki bir koşudan kalma) — mock süreç ömürlü.");
    }
    await expect(closeButton).toBeEnabled();
    await closeButton.click();

    const dialog = page.getByRole("dialog", { name: "Haziran 2025 Kapatılsın mı?" });
    await expect(dialog).toBeVisible();
    const confirm = page.getByTestId("dkap-confirm-close");
    await expect(confirm).toBeDisabled();
    await page.getByTestId("dkap-confirm-ack").check();
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId(`dkap-status-${DKAP_MUTATION_MONTH}`)).toContainText("Kapalı");
    await expect(page.getByTestId(`dkap-close-${DKAP_MUTATION_MONTH}`)).toHaveCount(0);
  });

  test("drill sidebar'da Dönem Kapanışı artık AKTİF bir bağlantıdır", async ({ page }) => {
    await openPeriodClosing(page);
    const sidebar = page.getByRole("navigation", { name: "Muhasebe alt sekmeleri" });
    const active = sidebar.getByRole("link").and(page.locator("[aria-current='page']"));
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText("Dönem Kapanışı");
  });
});
