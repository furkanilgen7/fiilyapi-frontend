import { test, expect, type Page } from "@playwright/test";

// F-PT T4 · "Yeni Personel Kaydı" formu — FONKSİYONEL e2e (görsel DEĞİL).
//
// Kanıtlanan zincir: puantajdan giriş → form doldur → kaydet → puantaj
// matrisinde YENİ SATIR göründü. jsdom testleri BFF izin listesini ve gerçek
// yönlendirmeyi görmez; bu dosya onları da kapsar.
//
// 🔒 FİKSTÜR İZOLASYONU (mock-backend'deki nota göre): 2026-08 · s-1 GÖRSEL
// kadrajdır ve DEĞİŞTİRİLMEZ. Yeni personel `state.personnel`e eklenir ve
// AKTİF olduğu için matriste hücresiz satır olarak görünür (T2 kararı K1) —
// bu yüzden matris okuması EYLÜL (2026-09) oyun alanında yapılır.
//
// ⚠️ `getByRole("alert")` bu depoda YASAKTIR — görünür metinle iddia edilir.
//
// ⚠️ AKIŞ-SSR ÇİFT KOPYA: sunucu kopyası + hidrasyon kopyası kısa bir an yan
// yana durur ve strict-mode ihlali verir (Linux CI run 31218793998, macOS'ta
// görülmez). TEKİL eleman bekleyen her locator `.first()` alır.

const SEPTEMBER = "year=2026&month=9";
const SITE_URL = "/projeler/p-1/santiyeler/s-1/puantaj";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** Alt eylem şeridindeki gönderim butonu (mockup 212; üst şeritte de var). */
function submitButton(page: Page) {
  return page
    .locator(".pf-actions")
    .first()
    .getByRole("button", { name: "Personeli Kaydet" });
}

test("puantajdan girilir, personel kaydedilir ve matriste satır olur", async ({ page }) => {
  await login(page);
  await page.goto(`${SITE_URL}?${SEPTEMBER}`);

  // Giriş noktası (mockup'ta YOK — spec §4 S2(a) onaylı türetimi).
  await page.getByRole("link", { name: "Personel Ekle" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Yeni Personel Kaydı" }).first(),
  ).toBeVisible();

  // Doldurulabilir DÖRT alan (mockup 63, 64, 91, 99).
  await page.getByLabel("Ad", { exact: true }).first().fill("Zeki");
  await page.getByLabel("Soyad").first().fill("Karaca");
  await page.getByLabel("Çalışan Tipi").first().selectOption("subcontractor");
  // "Bağlı Taşeron" yalnız taşeron işçisinde açılır ve GERÇEK veriyi listeler.
  const subcontractor = page.getByLabel("Bağlı Taşeron").first();
  await expect(subcontractor).toBeEnabled();
  await subcontractor.selectOption({ label: "Aydın Elektrik Taah." });
  await page.getByLabel("Meslek / Görev").first().selectOption("Elektrikçi");

  await submitButton(page).click();

  // Geldiği puantaj ekranına DÖNER (dönem korunur) ve yeni kişi satır alır.
  await expect(page).toHaveURL(new RegExp(`${SITE_URL}\\?.*month=9`));
  await expect(
    page.locator(".ts-table").first().getByRole("rowheader", { name: /Zeki Karaca/ }),
  ).toBeVisible();
});

test("mockup'ın devre-dışı alanları basılır ama doldurulamaz", async ({ page }) => {
  await login(page);
  await page.goto("/personel/yeni");

  for (const label of ["TC Kimlik No", "Cep Telefonu", "Adres", "IBAN", "Atandığı Proje"]) {
    await expect(page.getByLabel(label).first()).toBeDisabled();
  }
  // Taslak yok (mockup 39, 211) — ikisi de devre dışı.
  await expect(page.getByRole("button", { name: "Taslak", exact: true }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Taslak Kaydet" }).first()).toBeDisabled();
  // Gerekçeler GÖRÜNÜR yazar.
  await expect(page.getByTestId("personnel-form-notices").first()).toContainText("Serbest Meslek");
});

test("boş formda yalnız etkin alanlar doğrulanır — devre-dışı yıldızlar engellemez", async ({
  page,
}) => {
  await login(page);
  await page.goto("/personel/yeni");
  await submitButton(page).click();

  await expect(page.getByText("Ad zorunludur.").first()).toBeVisible();
  await expect(page.getByText("Meslek / görev seçiniz.").first()).toBeVisible();
  // Devre-dışı zorunlu alanlar için hata ÜRETİLMEZ.
  await expect(page.getByText(/TC Kimlik No zorunlu/)).toHaveCount(0);
  // Sayfada kalır (kayıt gitmedi).
  await expect(
    page.getByRole("heading", { level: 1, name: "Yeni Personel Kaydı" }).first(),
  ).toBeVisible();
});
