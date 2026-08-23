import { test, expect } from "@playwright/test";

// Diger e2e spec'lerindeki (auth/settings) giris akisinin ayni yardimcisi.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("gosterge paneli yuklenir", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
  await expect(page.getByText(/Görünümü/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kule A" })).toBeVisible();
});

test("sirket varliklari kalemi acilir", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Şirket Varlıkları" }).click();
  await expect(page).toHaveURL(/sirket-varliklari/);
});

/**
 * 🔴 "Onay Bekleyenler" rozeti — SAYI ve YARIŞSIZLIK bekçisi (F-BORC T4).
 *
 * Fikstür eskiden `count: 0` dönüyordu (bayat yer tutucu); gerçek backend
 * `dashboard/service.py` ile onay motoruna BAĞLANDI ve gerçek sayıyı döner.
 *
 * 🔴 BU TEST SALT-OKURDUR ve ÖYLE KALMALIDIR. `scpp-8` onay kutusunun TEK
 * yazma hedefidir ve onu YALNIZ `onay-kutusu.spec.ts` mutasyona uğratır;
 * buradan ikinci bir yazan eklemek iki spec dosyası arasında YENİ bir yarış
 * yaratırdı (`fullyParallel: true`, tek paylaşılan sahte backend).
 *
 * Sayının o mutasyondan bağımsızlığı ZAMANLAMAYLA değil YAPIYLA sağlanır:
 * `mock-backend.ts` `dashboardPendingApprovalsCount` yazma hedefini sayımdan
 * çıkarır. Ölçüldü — `scpp-8` onaylıyken kutunun `total`ı 4→3 oynarken panel
 * sayımı 3'te KALDI. Bu yüzden `dashboard.png` / `shell-home.png` kareleri
 * mutasyon penceresinden etkilenmez.
 */
test("onay bekleyenler rozeti gercek sayiyi basar (yazma hedefinden bagimsiz)", async ({
  page,
}) => {
  await login(page);

  // Rozet YALNIZ count > 0 iken basılır — `count: 0` bayatlığına dönülürse
  // bu satır kırılır (eski fikstürde rozet hiç yoktu).
  await expect(page.getByTestId("dash-approvals-badge")).toHaveText("3");

  // Gövde de sayıyı taşır: `items` BİLEREK boş geldiği için kart
  // "Onay Kutusu / {count} bekleyen" satırına düşer (gerçek backend de
  // `items`i boş bırakır — zarf `list[str]`, mockup satırı dört olgu ister).
  // 🔴 KARTA KAPSAMLANIR: kenar çubuğu da `/onay-kutusu`ya giden bir bağlantı
  // taşır; kapsamsız `getByRole("link")` strict-mode ihlali verir (ölçüldü).
  const card = page.locator(".dash-list-card").filter({ hasText: "Onay Bekleyenler" });
  await expect(card.getByRole("link", { name: /Onay Kutusu/ })).toContainText("3 bekleyen");
});
