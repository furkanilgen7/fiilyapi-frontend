import { test, expect, type Page } from "@playwright/test";

// F-P5 T5 · TL (`/sozlesmeler/taseronlar`) fonksiyonel e2e. Kapsam: rotanın
// ComingSoon'dan çıkması, üç kaynaklı agregasyonun gerçek mock uçlarından
// gelmesi, PUAN kolonunun "—" düşmesi, istemci arama/kategori süzmesi, satır
// linkinin hedefi, paylaşılan modalın açılıp doğrulama yapması.
//
// ⚠️ `getByRole("alert")` KULLANILMAZ (Next route-announcer tuzağı).
//
// 🔒 FİKSTÜR İZOLASYONU: mock state tüm koşu boyunca TEKTİR ve spec'ler
// PARALEL koşar. Bu dosya HİÇBİR kaydı mutasyona uğratmaz — modal testi
// yalnız AÇILIŞ + istemci doğrulaması üzerinden yürür, POST HİÇ atılmaz.
// (Başarılı oluşturma yolu Vitest'te `SubcontractorFormModal.test.tsx`te
// kapsanır.) Bir POST atılsaydı `state.subcontractors` büyür ve personel
// formunun "Bağlı Taşeron" seçicisini okuyan spec'ler kirlenirdi.
//
// Zamanlayıcıya dayalı bekleme YOK.

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("taşeron listesi: rota ComingSoon değil, üç kaynaklı agregasyon basılır", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/taseronlar");

  await expect(page.getByRole("heading", { name: "Taşeron Listesi" })).toBeVisible();
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);
  await expect(page.getByTestId("tl-kpi-strip")).toBeVisible();

  // Mockup 45-52 · sekiz kolonun hepsi basılır (yedincisi "Puan").
  for (const name of [
    "Firma",
    "Kategori",
    "Aktif Sözl.",
    "Toplam Sözl. Bedeli",
    "Ödenen",
    "Bekleyen Hak.",
    "Puan",
  ]) {
    await expect(page.getByRole("columnheader", { name })).toBeVisible();
  }

  // Fikstür taşeronları (`GET /subcontractors`) satır olarak gelir.
  await expect(page.getByRole("cell", { name: "Aydın Elektrik Taah." })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Çelik İnşaat Taah." })).toBeVisible();

  // Hakediş listesi kırpılmadı → para değerleri PENDING'e DÜŞMEZ.
  await expect(page.getByTestId("tl-truncation-notice")).toHaveCount(0);
  await expect(page.getByTestId("tl-kpi-month-payment")).not.toHaveText("—");
});

test("taşeron listesi: PUAN kolonu '—' + gerekçe, yıldız yok (ONAYLI KARAR S4)", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/taseronlar");

  const rating = page.getByTestId("tl-rating-pending").first();
  await expect(rating).toBeVisible();
  await expect(rating).toHaveAttribute("title", "Taşeron değerlendirme özelliği henüz yok");
  await expect(page.getByText("★")).toHaveCount(0);
});

test("taşeron listesi: arama ve kategori İSTEMCİDE süzer", async ({ page }) => {
  await login(page);
  await page.goto("/sozlesmeler/taseronlar");
  await expect(page.getByRole("cell", { name: "Çelik İnşaat Taah." })).toBeVisible();

  await page.getByLabel("Taşeron ara").fill("Aydın");
  await expect(page.getByRole("cell", { name: "Aydın Elektrik Taah." })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Çelik İnşaat Taah." })).toHaveCount(0);

  await page.getByLabel("Taşeron ara").fill("");
  // Kategori seçenekleri GERÇEK veriden gelir (fikstürde "Elektrik" var).
  await page.getByLabel("Kategori filtresi").selectOption("Elektrik");
  await expect(page.getByRole("cell", { name: "Aydın Elektrik Taah." })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Çelik İnşaat Taah." })).toHaveCount(0);
});

test("taşeron listesi: satır linki taşeron sözleşme detayına gider", async ({ page }) => {
  await login(page);
  await page.goto("/sozlesmeler/taseronlar");

  await expect(page.getByRole("link", { name: "Detay →" }).first()).toHaveAttribute(
    "href",
    /\/sozlesmeler\/taseron\/[^/]+$/,
  );
});

test("taşeron listesi: paylaşılan modal açılır ve boş ünvanı reddeder (POST YOK)", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/taseronlar");

  await page.getByRole("button", { name: "+ Taşeron Ekle" }).click();
  const dialog = page.getByRole("dialog", { name: "Yeni Taşeron Ekle" });
  await expect(dialog).toBeVisible();

  // İstemci doğrulaması: ağa çıkılmaz, kayıt oluşmaz → fikstür kirlenmez.
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(dialog.getByText("Taşeron ünvanı zorunludur.")).toBeVisible();

  await dialog.getByRole("button", { name: "Vazgeç" }).click();
  await expect(dialog).toHaveCount(0);
});
