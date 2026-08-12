import { test, expect, type Page } from "@playwright/test";

// F-PT2 T2 · `/personel` liste ekranı — FONKSİYONEL e2e (görsel DEĞİL; görsel
// spec'ler T4'te). Kanıtlanan zincir: kabuk sidebar'ı gerçek ekranı açar
// (ComingSoon DEĞİL) → arama SUNUCUYA `q` olarak gider (TELDEN kanıt) →
// meslek süzgeci İSTEMCİDE çalışır (yeni istek ATILMAZ, TELDEN kanıt) →
// Detay bağlantısı doğru rotaya gider.
//
// 🔒 FİKSTÜR İZOLASYONU (T1 notu): `per-1…per-6` puantaj GÖRSEL kadrajının VE
// bu dilimin baseline'larının kaynağıdır — bu dosya SALT-OKUR kalır, personel
// fikstürlerini MUTASYONA UĞRATMAZ.
//
// ⚠️ `getByRole("alert")` bu depoda YASAKTIR. Tekil eleman bekleyen locator'lar
// akış-SSR çift-kopya tuzağına karşı `.first()` alır.

const PERSONNEL_URL = "/personel";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("kabuk sidebar'ındaki 'Personel' gerçek ekranı açar (ComingSoon DEĞİL)", async ({ page }) => {
  await login(page);

  await page.getByRole("navigation").getByRole("link", { name: "Personel" }).first().click();
  await expect(page).toHaveURL(/\/personel$/);
  await expect(page.getByRole("heading", { name: "İnsan Kaynakları" })).toBeVisible();
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);
});

test("KPI şeridi + sekmeler + tablo sunucu fikstüründen gelir", async ({ page }) => {
  await login(page);
  await page.goto(PERSONNEL_URL);

  // ⚠️ Mock backend TÜM spec dosyaları arasında PAYLAŞILIR (paralel worker'lar
  // eşzamanlı POST yapabilir) — toplam sayı deterministik değildir, bu yüzden
  // yalnız kartların VARLIĞI ve bilinen fikstür satırları sınanır (tam sayı
  // DEĞİL).
  const strip = page.getByTestId("personel-kpi-strip");
  await expect(strip).toContainText("Toplam Personel");
  await expect(strip).toContainText("Şirket Kadrosu");
  await expect(strip).toContainText("Taşeron İşçisi");

  // Sekme şeridi: yalnız "Puantaj" gerçek rotaya gider (spec K3).
  await expect(page.getByRole("tab", { name: "Personel Listesi" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const timesheetTab = page.getByRole("tab", { name: "Puantaj" }).first();
  await expect(timesheetTab).toHaveAttribute("href", "/puantaj");
  await expect(page.getByRole("tab", { name: "İzin Yönetimi" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  // Tablo satırları — Tür rozeti sunucudan.
  await expect(page.getByTestId("personel-row-per-1")).toContainText("Mehmet Kılıç");
  await expect(page.getByTestId("personel-row-per-1")).toContainText("Şirket");
  await expect(page.getByTestId("personel-row-per-3")).toContainText("Taşeron");

  // K1 · Proje/SGK/Ücret-Gün hücreleri pending "—" — sütun SİLİNMEZ.
  await expect(page.getByTestId("personel-project-pending-per-1")).toHaveText("—");
});

test("arama SUNUCUYA ?q= olarak gider (TELDEN kanıt)", async ({ page }) => {
  await login(page);
  await page.goto(PERSONNEL_URL);
  await expect(page.getByTestId("personel-row-per-1")).toBeVisible();

  const searchRequest = page.waitForRequest(
    (request) => request.url().includes("/personnel") && request.url().includes("q=Ramazan"),
  );
  await page.getByLabel("Personel ara").fill("Ramazan");
  await searchRequest;

  await expect(page).toHaveURL(/q=Ramazan/);
  await expect(page.getByTestId("personel-row-per-3")).toContainText("Ramazan Yıldız");
  await expect(page.getByTestId("personel-row-per-1")).toHaveCount(0);
});

test("meslek süzgeci İSTEMCİDE çalışır — yeni istek ATILMAZ (TELDEN kanıt)", async ({ page }) => {
  await login(page);
  await page.goto(PERSONNEL_URL);
  await expect(page.getByTestId("personel-row-per-1")).toBeVisible();

  const personnelRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/backend/personnel") && !url.includes("/personnel/")) {
      personnelRequests.push(url);
    }
  });

  await page.getByLabel("Meslek filtresi").selectOption("Elektrikçi");
  await expect(page.getByTestId("personel-row-per-3")).toContainText("Ramazan Yıldız");
  await expect(page.getByTestId("personel-row-per-1")).toHaveCount(0);

  // Süzgeç URL'e yazılır (paylaşılabilir) ama sunucuya YENİ istek gitmez.
  await expect(page).toHaveURL(/meslek=Elektrik%C3%A7i/);
  expect(personnelRequests, `meslek süzgeci sunucuya istek ATMAMALI: ${personnelRequests.join(", ")}`).toHaveLength(0);
});

test("durum süzgecinde 'İzinde' basılır ama seçilemez; Aktif/Pasif GERÇEKtir", async ({ page }) => {
  await login(page);
  await page.goto(PERSONNEL_URL);
  await expect(page.getByTestId("personel-row-per-1")).toBeVisible();

  await expect(page.getByRole("option", { name: "İzinde" })).toBeDisabled();

  const inactiveRequest = page.waitForRequest(
    (request) => request.url().includes("/personnel") && request.url().includes("is_active=false"),
  );
  await page.getByLabel("Durum filtresi").selectOption("inactive");
  await inactiveRequest;

  await expect(page.getByTestId("personel-row-per-6")).toContainText("Kemal Toprak");
  await expect(page.getByTestId("personel-row-per-1")).toHaveCount(0);
});

test("Detay bağlantısı doğru rotaya gider", async ({ page }) => {
  await login(page);
  await page.goto(PERSONNEL_URL);
  await expect(page.getByTestId("personel-row-per-1")).toBeVisible();

  const detailLink = page.getByTestId("personel-row-per-1").getByRole("link", { name: "Detay" });
  await expect(detailLink).toHaveAttribute("href", "/personel/per-1");
});

test("'+ Personel Ekle' mevcut forma döner, 'Dışa Aktar' devre-dışıdır", async ({ page }) => {
  await login(page);
  await page.goto(PERSONNEL_URL);

  await expect(page.getByRole("button", { name: "Dışa Aktar" }).first()).toBeDisabled();

  await page.getByRole("link", { name: "+ Personel Ekle" }).first().click();
  await expect(page).toHaveURL(/\/personel\/yeni\?donus=\/personel/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Yeni Personel Kaydı" }).first(),
  ).toBeVisible();
});
