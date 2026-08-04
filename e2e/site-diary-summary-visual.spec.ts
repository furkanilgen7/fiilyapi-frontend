import { test, expect } from "@playwright/test";

// F-SD T6 · "Hakediş Özeti" modu görsel testi (mockup `Şantiye - Hakediş
// Özeti.dc.html`, HÖ). `site-diary-visual.spec.ts` ile aynı kurallar:
// SALT-OKUR (hiçbir mutasyon yok) + saat sabitleme NAVİGASYONDAN ÖNCE.
//
// Dönem varsayılanı içinde bulunulan aydır — saat 2026-07-20'ye sabitlenerek
// ekran Temmuz 2026 fikstürlerine (yalnız GÖNDERİLMİŞ d-1) bakar. KPI şeridi
// ve karlılık paneli hakediş listelerinden türetilir; o listelerin mutasyona
// uğrayan kayıtları (`pp-6`, `scpp-6`/`scpp-7`) mock'ta `hiddenFromLists` ile
// dışlanmıştır — bu baseline diğer spec'lerin koşma sırasından bağımsızdır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("gunluk kayit hakedis ozeti ekrani gorsel", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-20T09:00:00Z"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/s-1/gunluk-kayit/ozet");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hakediş Özeti — A-Blok Şantiyesi" }),
  ).toBeVisible();
  await expect(page.locator(".diary-month-nav__label")).toHaveText("Temmuz 2026");
  // Tablo GERÇEK veriyle doldu — yükleme durumu dondurulmasın.
  await expect(page.locator(".diary-summary-table")).toContainText("C25/30 Beton (Döşeme)");
  // KPI şeridi ve karlılık paneli de basıldı.
  await expect(page.locator(".diary-kpis")).toBeVisible();

  await expect(page).toHaveScreenshot("gunluk-kayit-ozet.png", { fullPage: true });
});
