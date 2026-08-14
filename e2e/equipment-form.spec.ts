import { test, expect, type Page, type Route } from "@playwright/test";

import { EQUIPMENT_NEW_URL, EQUIPMENT_URL, login } from "./equipment-helpers";

// F-MK T5b · M2 (`/makine/yeni` + `/makine/{id}/duzenle`) FONKSİYONEL e2e'si.
//
// Kapsam: iki rota da AÇILIYOR (ComingSoon DEĞİL) · düzenleme kipi SUNUCU
// künyesiyle DOLU geliyor · K8 koşullu zorunluluk (istemci kapısı ağa
// ÇIKMADAN durduruyor, `rented` seçilince geçiyor).
//
// 🔒 FİKSTÜR İZOLASYONU (F-ST/F-SA kuralı): ekipman kayıtlarının PROJE KAPSAMI
// YOKTUR — başarılı bir POST kart ızgarasına altıncı kartı ekler, KPI
// sayaçlarını ve `equipment-visual` baseline'larını sessizce kırardı. Bu
// yüzden gönderim BFF katmanında `page.route` ile karşılanır: istek gerçekten
// ATILIR ve gövdesi ÖLÇÜLÜR, ama mock sunucu durumu HİÇ değişmez →
// `fullyParallel` altında baseline yarışı yoktur.

const EQUIPMENT_BFF_PATH = "/api/backend/equipment";

/** Yakalanan POST gövdeleri — "istek atıldı mı" iddiasının tek kaynağı. */
type CapturedBody = Record<string, unknown>;

async function captureCreateRequests(page: Page, captured: CapturedBody[]) {
  await page.route(
    (url) => url.pathname === EQUIPMENT_BFF_PATH,
    async (route: Route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      captured.push((route.request().postDataJSON() ?? {}) as CapturedBody);
      // Sunucu durumu DEĞİŞMEZ: yanıt burada üretilir, mock'a hiç ulaşmaz.
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "eq-route-stub" }),
      });
    },
  );
}

test("'/makine/yeni' gerçek formu açar (ComingSoon DEĞİL)", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_NEW_URL);

  await expect(page.getByRole("heading", { level: 1, name: "Yeni Makine / Ekipman" })).toBeVisible();
  await expect(page.getByTestId("equipment-form-body")).toBeVisible();
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);
});

test("düzenleme kipi SUNUCU künyesiyle DOLU gelir", async ({ page }) => {
  await login(page);
  await page.goto(`${EQUIPMENT_URL}/eq-1/duzenle`);

  await expect(page.getByRole("heading", { level: 1, name: "Makine / Ekipman Düzenle" })).toBeVisible();

  // Değerler `GET /equipment/{id}` künyesinden gelir — form boş açılmaz.
  await expect(page.getByLabel("Ekipman Adı")).toHaveValue("Tower Crane TC-48");
  await expect(page.getByLabel("Kategori")).toHaveValue("crane");
  // K7 — mockup'ın tek "Marka / Model" alanı sunucuda İKİ kolondur.
  await expect(page.getByLabel("Marka")).toHaveValue("Liebherr");
  await expect(page.getByLabel("Model", { exact: true })).toHaveValue("154 EC-H");
  await expect(page.getByLabel("Alış Bedeli (₺)")).toHaveValue("3800000.00");
  // K6 — etiket mockup'tan, değer ŞANTİYEDİR.
  await expect(page.getByLabel("Atandığı Proje")).toHaveValue("s-1");
  await expect(page.getByLabel("Durum")).toHaveValue("working");
});

test("K8 — 'owned' iken boş Alış Bedeli gönderimi DURDURUR; 'rented' seçilince geçer", async ({
  page,
}) => {
  const captured: CapturedBody[] = [];
  await captureCreateRequests(page, captured);

  await login(page);
  await page.goto(EQUIPMENT_NEW_URL);

  // Zorunlu alanların GERİ KALANI dolu — kalan tek engel K8 olsun.
  await page.getByLabel("Ekipman Adı").fill("SMOKE-Ekipman");
  await page.getByLabel("Kategori").selectOption("machinery");
  await page.getByLabel("Atandığı Proje").selectOption("__depoda__");

  // Mockup'ta "Kendi Malımız" SEÇİLİDİR ⇒ Alış Bedeli zorunludur.
  await page.locator("button.pf-topbar-submit").click();
  await expect(page.getByTestId("equipment-form-error")).toContainText(
    "Kendi malımız ekipmanda alış bedeli zorunludur.",
  );
  // 🔴 İstemci kapısı AĞA ÇIKMADAN durdurur — sunucu 422'si tek savunma değil.
  expect(captured).toHaveLength(0);

  // Kiralık makinenin alış bedeli yoktur → zorunluluk DÜŞER, gönderim geçer.
  await page.getByTestId("makine-sahiplik-rented").click();
  await page.locator("button.pf-topbar-submit").click();

  await expect(page).toHaveURL(/\/makine$/);
  expect(captured).toHaveLength(1);
  expect(captured[0].ownership).toBe("rented");
  // Boş metin `null`a düşer — sunucuya "" yazmak veri değil gürültüdür.
  expect(captured[0].purchase_amount).toBeNull();
  expect(captured[0].name).toBe("SMOKE-Ekipman");
  // "Depoda (Atanmadı)" ⇒ `site_id: null` (K6).
  expect(captured[0].site_id).toBeNull();
});
