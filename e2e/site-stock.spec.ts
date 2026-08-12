import { test, expect, type Page } from "@playwright/test";

// F-ST T3 · Şantiye › Stok (ŞS) FONKSİYONEL e2e'si — görsel spec'ler T5'te
// (dosya adında "gorsel"/"visual" GEÇMEZ ki beşinci kapıda koşsun).
//
// Kapsam: drill sekmesinin ComingSoon'dan ÇIKTIĞI · sekme aktifliğinin TEK
// olduğu (F-SD çift aktiflik dersi) · KPI şeridi + tablo satırlarının SUNUCU
// verisinden geldiği · pending iki sütunun gerekçeli "—" bastığı · satır
// aksiyonlarının devre dışı olduğu · "+ Stok Girişi" link hedefi · şantiye
// bakiyesinin MERKEZ depoyu KAPSAMADIĞI (telden görülen kapsam kuralı).
//
// 🔒 FİKSTÜR İZOLASYONU (T1/T2 kuralı): stok kayıtlarının PROJE KAPSAMI YOKTUR;
// başarılı bir yazma T5'in görsel baseline'larını sessizce kırar. Bu dosya
// YALNIZ OKUR.

const SITE_STOCK_URL = "/projeler/p-1/santiyeler/s-1/stok";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("drill 'Stok' sekmesi gerçek ekranı açar (ComingSoon DEĞİL) ve TEK sekme aktiftir", async ({
  page,
}) => {
  await login(page);
  await page.goto("/projeler/p-1/santiyeler/s-1");

  await page.getByRole("tab", { name: "Stok" }).click();
  await expect(page).toHaveURL(/\/santiyeler\/s-1\/stok$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi — Stok Durumu" }),
  ).toBeVisible();
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);

  // Çift aktiflik olmaz: kök sekme ("Bölümler") ön ek eşleşmesiyle seçilmez.
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  await expect(page.getByRole("tab", { name: "Stok" })).toHaveAttribute("aria-selected", "true");
  // Drill sidebar'da da tek aktif öğe (F-SD T7 bulgusu).
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Stok", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("KPI şeridi ve tablo SUNUCU verisinden gelir; merkez depo bakiyeye GİRMEZ", async ({
  page,
}) => {
  await login(page);
  await page.goto(SITE_STOCK_URL);

  const strip = page.getByTestId("santiye-stok-kpi-strip");
  await expect(strip).toContainText("Toplam Malzeme");
  await expect(strip).toContainText("Kritik Stok");
  await expect(strip).toContainText("Düşük Stok");
  await expect(strip).toContainText("Stok Değeri");
  // E3'ün kartı ŞS'de ÇİZİLMEMİŞTİR.
  await expect(strip).not.toContainText("Bekleyen Sipariş");

  // wh-1/wh-2/wh-4 s-1'in depolarıdır; wh-3 (s-2) ve wh-0 (merkez) HARİÇTİR.
  // it-7 (SNK-0447) YALNIZ wh-3'te hareket görür → bu şantiyede satırı YOKTUR.
  await expect(page.getByTestId("santiye-stok-row-SNK-0421")).toBeVisible();
  await expect(page.getByTestId("santiye-stok-row-SNK-0447")).toHaveCount(0);

  // Rozet SUNUCUNUN damgasıdır; ŞS'de `normal` "Yeterli" basılır.
  await expect(page.getByTestId("santiye-stok-status-SNK-0421")).toHaveText("Kritik");
  await expect(page.getByTestId("santiye-stok-status-SNK-0055")).toHaveText("Yeterli");
  // Eşiksiz kalem (it-8 · min_stock null) rozet İCAT ETMEZ.
  await expect(page.getByTestId("santiye-stok-status-ICY-0090")).toHaveText("—");
});

test("'Aylık İhtiyaç' ve 'Bölüm' sütunları GEREKÇELİ pending basar (sayı uydurulmaz)", async ({
  page,
}) => {
  await login(page);
  await page.goto(SITE_STOCK_URL);

  const need = page.getByTestId("santiye-stok-need-SNK-0421");
  const section = page.getByTestId("santiye-stok-section-SNK-0421");
  await expect(need).toHaveText("—");
  await expect(section).toHaveText("—");
  await expect(need).toHaveAttribute("title", "Şantiye planlama türeviyle birlikte gelir");
  await expect(section).toHaveAttribute("title", "Şantiye planlama türeviyle birlikte gelir");

  // Mockup'ın örnek değerleri (15 / "Kat 6–10 Kaba İnşaat") BASILMAZ.
  await expect(page.getByText("Kat 6–10 Kaba İnşaat")).toHaveCount(0);

  // Gerekçe `title`da görünmez kalmasın diye metne de basılır.
  await expect(page.getByTestId("santiye-stok-pending-notice")).toContainText(
    "Şantiye planlama türeviyle birlikte gelir",
  );
});

test("satır aksiyonları ve 'Satınalma Talebi →' SA'ya pending: devre dışı + gerekçe", async ({
  page,
}) => {
  await login(page);
  await page.goto(SITE_STOCK_URL);

  const headerButton = page.getByRole("button", { name: "Satınalma Talebi →" });
  await expect(headerButton).toBeDisabled();
  await expect(headerButton).toHaveAttribute("title", "Satınalma modülüyle birlikte gelir");

  const criticalAction = page.getByTestId("santiye-stok-action-SNK-0421");
  await expect(criticalAction).toHaveText("Acil Sipariş");
  await expect(criticalAction).toBeDisabled();
  await expect(criticalAction).toHaveAttribute("title", "Satınalma modülüyle birlikte gelir");

  const detailAction = page.getByTestId("santiye-stok-action-SNK-0055");
  await expect(detailAction).toHaveText("Detay");
  await expect(detailAction).toBeDisabled();
});

test("'+ Stok Girişi' şantiye kapsamlı giriş rotasına bağlanır (T4 sözleşmesi)", async ({
  page,
}) => {
  await login(page);
  await page.goto(SITE_STOCK_URL);

  await expect(page.getByTestId("santiye-stok-giris-link")).toHaveAttribute(
    "href",
    "/projeler/p-1/santiyeler/s-1/stok/giris",
  );
});

test("görünmeyen şantiye 404 alır ve Türkçe GÖRÜNÜR mesaj basılır (ST §4b)", async ({ page }) => {
  await login(page);
  await page.goto("/projeler/p-1/santiyeler/yok-boyle-bir-santiye/stok");

  await expect(page.getByTestId("santiye-stok-error")).toContainText("bulunamadı");
});
