import { test, expect } from "@playwright/test";

/**
 * 🔴 F-PRJKALEM · PROJE DETAY SEKME ŞERİDİ — FONKSİYONEL BEKÇİ.
 *
 * Bu dosyanın varlık sebebi: `href`e bakan bir bekçi, hedefin ÇALIŞTIĞINI
 * KANITLAMAZ. Proje düzeyindeki "İş Kalemleri" sekmesi yıllarca devre-dışıydı
 * çünkü gerekçe ("iş kalemleri şantiye bazında tutulur") YARIM DOĞRUYDU:
 * ŞANTİYE BOQ'u (`/sites/{id}/boq`) gerçekten şantiye kapsamlıdır, ama proje
 * düzeyinde AYRI bir küme vardır ve doludur — SÖZLEŞME POZLARI
 * (`GET /projects/{project_id}/contract/items`). O kümenin ekranı da
 * yazılıydı (E14 `?tab=items`), yalnız sekme ona BAĞLANMAMIŞTI.
 *
 * Bu yüzden burada sekmeye TIKLANIR ve varılan ekranın gerçekten POZ TABLOSU
 * bastığı ölçülür. Ek olarak `(app)/[...slug]` catch-all'ı 404 yerine
 * 200 + "yakında" döndürdüğü için, "sayfa açıldı" iddiası tek başına
 * YETMEZ — tablonun kolon başlıkları aranır.
 */
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("proje detay: Is Kalemleri sekmesi sozlesme pozu tablosuna GOTURUR", async ({ page }) => {
  await login(page);
  await page.goto("/projeler/p-1");
  await expect(page.getByRole("heading", { level: 1, name: "Kule A" })).toBeVisible();

  const tabs = page.getByRole("tablist", { name: "Proje detay sekmeleri" });
  await tabs.getByRole("tab", { name: "İş Kalemleri" }).click();

  // Sekme `?tab=items` taşır: parametre düşerse sözleşmenin GENEL sekmesine
  // varılırdı ve kullanıcı poz tablosunu hiç görmezdi.
  await expect(page).toHaveURL(/\/sozlesmeler\/isveren\/p-1\?tab=items$/);

  // 🔴 ASIL İDDİA: varılan ekran GERÇEKTEN poz tablosu basıyor. Catch-all
  // "yakında" ekranı bu başlıkları ASLA basmaz.
  for (const header of ["Poz No", "Poz Adı", "Birim", "Toplam Miktar"]) {
    await expect(page.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
  }
  await expect(page.getByText(/yakında/i)).toHaveCount(0);
});

test("proje detay: sekme SOZLESME POZU, santiye cipi SANTIYE BOQ'u — farkli hedefler", async ({
  page,
}) => {
  await login(page);
  await page.goto("/projeler/p-1");
  await expect(page.getByTestId("site-list-grid")).toBeVisible();

  // Aynı ekranda AYNI etiket iki farklı kümeye gider. Hedeflerin AYRIŞTIĞI
  // burada kilitlenir — biri ötekine kaydırılırsa (ör. çip sözleşmeye, sekme
  // BOQ'a) bu iddia kırmızı verir.
  const tabHref = await page
    .getByRole("tablist", { name: "Proje detay sekmeleri" })
    .getByRole("tab", { name: "İş Kalemleri" })
    .getAttribute("href");
  expect(tabHref).toBe("/sozlesmeler/isveren/p-1?tab=items");

  const chipHref = await page
    .getByTestId("site-list-grid")
    .getByRole("link", { name: /İş Kalemleri/ })
    .first()
    .getAttribute("href");
  expect(chipHref).toMatch(/^\/projeler\/p-1\/santiyeler\/[^/]+\/is-kalemleri$/);
  expect(chipHref).not.toBe(tabHref);
});
