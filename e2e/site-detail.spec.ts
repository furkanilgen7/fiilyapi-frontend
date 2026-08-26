import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * F-BLMKART — Bölüm kartının DÖRT metriği (davranışsal, görsel DEĞİL).
 *
 * 🔴 NEDEN AYRI BİR DOSYA: kullanıcı canlıda bu dört kutunun HEPSİNİN boş
 * olduğunu bildirdi ve o sırada `site-detail-visual.spec.ts` YEŞİLDİ — kare
 * "—" basan bir kartı da mutlulukla kaydeder. K-IKIZ1: bir alanın DOLU
 * olduğunu geçen testler söylemez; ölçen tek şey ona ÇARPAN bir istektir.
 *
 * Bu dosya istek yolunu (BFF → ikiz) uçtan uca koşturur ve şunu ölçer:
 *   · "İş Kalemleri" · "Bölüm Bedeli" (+ BOQ alt satırı) GERÇEK sayı basar,
 *   · KARŞIT KANIT: "İlerleme" AYNI kartta hâlâ "—" basar (yer tutucu kalmalı).
 * İkisi bir arada olmadan test "her şey dolu" ya da "her şey boş" gibi iki
 * yanlıştan birini de geçirebilirdi.
 *
 * Beklenen sayılar ikizin fikstüründen TÜRETİLİR (`mock-backend.ts`):
 *   sec-1 · tahsisler bi-1 400×280 + bi-3 1200×1850 + bi-4 85×18500
 *         = 112.000 + 2.220.000 + 1.572.500 = 3.904.500 → "BOQ: ₺ 3,9M", 3 poz
 *         `budget_amount` = 1.250.000 → "₺ 1,3M"  (ELLE GİRİLEN ile BOQ AYRIŞIR)
 *   sec-3 · hiç tahsis YOK → 0 poz + "BOQ: ₺ 0" (yer tutucu DEĞİL, gerçek sıfır)
 */

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

function sectionCard(page: Page, name: string): Locator {
  return page.locator(".section-card").filter({ hasText: name });
}

function metric(card: Locator, label: string): Locator {
  return card.locator(".section-card__metric").filter({
    has: card.page().locator(".section-card__metric-label", { hasText: label }),
  });
}

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/projeler/p-1/santiyeler/s-1");
  await expect(page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi" })).toBeVisible();
});

test("aktif bolum karti BOQ turevi sayaci ve elle girilen bedeli birlikte basar", async ({ page }) => {
  const card = sectionCard(page, "Kat 6–10 Kaba İnşaat");

  // İş Kalemleri — TEK SAYI (mockup'ın "16 / 26" kesri bilinçli sapma).
  await expect(metric(card, "İş Kalemleri").locator(".section-card__metric-value")).toHaveText("3");

  // Bölüm Bedeli — elle girilen ASIL değer üstte, BOQ türevi altta.
  const budget = metric(card, "Bölüm Bedeli");
  await expect(budget.locator(".section-card__metric-value")).toHaveText("₺ 1,3M");
  await expect(budget.locator(".section-card__metric-note")).toHaveText("BOQ: ₺ 3,9M");
});

test("KARSIT KANIT — ayni kartta 'İlerleme' hâlâ yer tutucudur", async ({ page }) => {
  const card = sectionCard(page, "Kat 6–10 Kaba İnşaat");
  const progress = metric(card, "İlerleme");
  await expect(progress.locator(".section-card__metric-value")).toHaveText("—");
  // Sahte %0 izlenimi vermemek için dolgu ÇİZİLMEZ, boş iz kalır.
  await expect(card.locator('[data-testid="section-card-progress-track"]')).toBeVisible();
  await expect(card.locator('[data-testid="section-card-progress-fill"]')).toHaveCount(0);
});

test("tahsisi olmayan bolum GERCEK SIFIR basar, yer tutucuya dusmez (K-MKD3)", async ({ page }) => {
  const card = sectionCard(page, "Peyzaj Düzenlemesi (Taslak)");

  await expect(metric(card, "İş Kalemleri").locator(".section-card__metric-value")).toHaveText("0");

  const budget = metric(card, "Tahmini Bedel");
  await expect(budget.locator(".section-card__metric-note")).toHaveText("BOQ: ₺ 0");
  // `budget_amount` GİRİLMEMİŞ — bu ayrı bir hâldir ve "0" DEĞİL "—" basar.
  await expect(budget.locator(".section-card__metric-value")).toHaveText("—");

  // `planned_worker_count` de girilmemiş: sahte sıfır yok.
  await expect(metric(card, "Planlanan İşçi").locator(".section-card__metric-value")).toHaveText("—");
});

test("tamamlanmis bolum kendi sayaclarini basar (bolumler ayrisir, karismaz)", async ({ page }) => {
  const card = sectionCard(page, "Zemin Kat Kaba İnşaat");
  await expect(metric(card, "İş Kalemleri").locator(".section-card__metric-value")).toHaveText("2");
  const budget = metric(card, "Bölüm Bedeli");
  await expect(budget.locator(".section-card__metric-value")).toHaveText("₺ 480B");
  await expect(budget.locator(".section-card__metric-note")).toHaveText("BOQ: ₺ 1M");
});
