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

  test("K4 — özet şeridinin dört sayısı DK:69 örneğiyle aynıdır (6/1/1/4)", async ({ page }) => {
    await openPeriodClosing(page);
    await expect(page.getByTestId("dkap-summary")).toContainText(
      "6 kapalı · 1 kapatılabilir · 1 engelli · 4 kayıt yok",
    );
  });

  test("K2 — Temmuz engelli: düğme devre dışı + hata bandı taslak sayısını gösterir", async ({
    page,
  }) => {
    await openPeriodClosing(page);
    const closeButton = page.getByTestId("dkap-close-7");
    await expect(closeButton).toBeDisabled();
    await expect(page.getByTestId("dkap-blocked-reason-7")).toContainText(
      "Dönem kapatılamıyor — 3 taslak fiş var",
    );
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
