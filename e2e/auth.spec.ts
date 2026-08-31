import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
}

test("giris → kabuk → yakinda → cikis akisi", async ({ page }) => {
  await login(page);

  // Kabuk gorunur: sidebar grup basligi + kullanici adi + karsilama
  await expect(page.getByText("Genel")).toBeVisible();
  await expect(page.getByText("Ahmet Yılmaz", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
  // Gosterge Paneli aktif
  await expect(page.getByRole("link", { name: /Gösterge Paneli/ })).toHaveAttribute("aria-current", "page");

  // Yapilmamis modul → yakinda
  // NOT: P1 oncesi bu senaryo /projeler kullaniyordu, sonra /raporlar'a
  // gecirildi; F-RAPOR ikisini de gercek ekran yapti. Kabuk nav'inda
  // catch-all'a dusen TEK oge kaldi: /sirket-varliklari. Bu senaryo o oge de
  // yazildigi gun yeniden tasinmalidir (ya da silinmelidir) — bugun ComingSoon
  // yolunun TEK canli e2e kaniti budur.
  await page.getByRole("link", { name: /Şirket Varlıkları/ }).click();
  await expect(page).toHaveURL(/\/sirket-varliklari/);
  await expect(page.getByText(/yakında/i)).toBeVisible();

  // Sidebar'dan cikis
  await page.getByRole("button", { name: /çıkış/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("yanlis parola hata gosterir", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("wrong");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/e-posta veya şifre hatalı/i)).toBeVisible();
});

test("oturumsuz korumali rota /login'e yonlendirir", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2F/);
});

test("token cookie httpOnly — document.cookie'de gorunmez", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Ahmet Yılmaz", { exact: true })).toBeVisible();
  const cookieStr = await page.evaluate(() => document.cookie);
  expect(cookieStr).not.toContain("fiil_access");
});
