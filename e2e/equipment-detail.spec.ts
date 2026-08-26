import { test, expect } from "@playwright/test";

import { EQUIPMENT_URL, login } from "./equipment-helpers";

// F-MKD · `/makine/{id}` Ekipman Detay FONKSİYONEL e2e'si.
//
// SALT-OKUR: hiçbir POST/PATCH tetiklemez → `fullyParallel` altında yarış
// YOKTUR (ekipman fikstürlerinin ortak gerekçesi).
//
// 📅 TARİH BAĞIMSIZ: ekran "bu ay"ı `GET /equipment/{id}/detail` yanıtının
// `as_of` damgasından okur, `new Date()`ten DEĞİL; ikiz o damgayı fikstür
// ayına (2026-08-20) SABİTLER. Bu yüzden ne `page.clock` ne de URL dönem
// parametresi gerekir.

test("kart adı detaya götürür — rota GERÇEKTEN çözülüyor mu ölçülür", async ({ page }) => {
  await login(page);
  await page.goto(EQUIPMENT_URL);

  await page.locator('[data-equipment-id="eq-1"]').getByText("Tower Crane TC-48").click();

  // 🔴 Statik kardeşler (`/makine/yeni`, `/makine/kira` …) dinamik segmentten
  // ÖNCE eşleşir; buradaki iddia dinamik segmentin GERÇEKTEN indiği yeri
  // ölçer (F-TKV/F-KIRA dersi: rota çözümü VARSAYILMAZ).
  await expect(page).toHaveURL(/\/makine\/eq-1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tower Crane TC-48" })).toBeVisible();
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);
});

test("KENDİ MALIMIZ ekipman: bakım çubuğu + türev sayılar sunucudan", async ({ page }) => {
  await login(page);
  await page.goto(`${EQUIPMENT_URL}/eq-1`);

  await expect(page.getByTestId("makine-det-loaded-detail")).toHaveCount(1);

  // Bakım türevleri (`maintenance.py`) — 14.286 hourmeter, 14.000 son bakım,
  // 500 saatlik periyot ⇒ 286 kullanıldı / 214 kaldı / %57,2.
  await expect(page.getByTestId("makine-det-remaining")).toContainText("214");
  await expect(page.getByTestId("makine-det-usage-pct")).toContainText("%57,2");
  await expect(page.getByTestId("makine-det-estimated")).toContainText("~05.09.2026");
  // Dayanak günü ekranda AÇIKÇA durur.
  await expect(page.getByTestId("makine-det-as-of")).toContainText("20.08.2026");

  // Sahiplik bandı KENDİ MALIMIZ metnine düşer (mockup yalnız kiralık hâli
  // çiziyor; ekran ikisini de doğru basar).
  await expect(page.getByTestId("makine-det-ownership-band")).toContainText("kendi malımızdır");
  // 🔴 KENDİ MALIMIZ makinede tedarikçi kaydı SATICIDIR, kiralayan DEĞİL —
  // etiket sahiplikten türer.
  await expect(page.getByLabel("Kiralama Bilgileri")).toContainText("Satıcı Firma");

  // 🔴 Yakıt kutuları BU makinenin toplamıdır, filonun değil: uç
  // `equipment_id` süzgecini SUNUCUDA uygular ve toplamları SÜZÜLMÜŞ
  // satırlardan üretir (`service/fuel_summary.py`).
  await expect(page.getByTestId("makine-det-fuel-liters")).toContainText("980");
  await expect(page.getByTestId("makine-det-fuel-amount")).toContainText("₺38.900");
});

test("KİRALIK ekipman: kiralama kartı dolu, bakım penceresi YOK, belge rozetleri türer", async ({
  page,
}) => {
  await login(page);
  await page.goto(`${EQUIPMENT_URL}/eq-3`);

  await expect(page.getByTestId("makine-det-loaded-detail")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-supplier")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-documents")).toHaveCount(1);

  // Kiralama kartı: SAKLANAN yedi alan + TEK türev.
  const rental = page.getByLabel("Kiralama Bilgileri");
  await expect(rental).toContainText("LT-KRA-2026-004");
  await expect(rental).toContainText("01.03.2026");
  await expect(page.getByTestId("makine-det-cumulative-paid")).toContainText("₺284.160");
  // 🔴 Hesaplanamayan satır SESSİZ DÜŞMEZ.
  await expect(page.getByTestId("makine-det-rental-unknown")).toContainText("2 satırının");

  // 🔴 `maintenance_period: null` ⇒ saat penceresi YOK; çubuk ÇİZİLMEZ ama
  // BİLİNEN olgu (son bakım tarihi) ekranda kalır.
  await expect(page.getByTestId("makine-det-usage-missing")).toBeVisible();
  await expect(page.getByTestId("makine-det-usage-pct")).toHaveCount(0);
  await expect(page.getByLabel("Bakım Bilgileri")).toContainText("04.06.2026");

  // Belge geçerliliği SUNUCUNUN gününe göre türer: 2026-08-20 → 2026-09-10
  // 21 gün, 2026-07-01 ise GEÇMİŞ.
  // `exact: true` ZORUNLU: sayaç şeridi de aynı ifadeleri taşır ve gevşek
  // eşleşme strict-mode ihlaline düşer.
  await expect(page.getByText("21 gün kaldı", { exact: true })).toBeVisible();
  await expect(page.getByText("Süresi doldu", { exact: true })).toBeVisible();
  await expect(page.getByTestId("makine-det-doc-count")).toContainText(
    "2 belge · 1 süresi yaklaşıyor · 1 süresi doldu",
  );
});

test("🔴 kira hakedişi bağlantısı YALNIZ bu ekipmanın hakedişinden gelir", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/equipment/rental-invoices")) requested.push(request.url());
  });

  await login(page);
  await page.goto(`${EQUIPMENT_URL}/eq-3`);
  await expect(page.getByTestId("makine-det-loaded-invoices")).toHaveCount(1);

  // Süzgeç GERÇEKTEN gönderiliyor mu — `useEquipmentRentalInvoices` filtresi
  // bu alanı TAŞIMIYORDU; eksikliği sessizdi ve ekran filonun tamamını
  // gösterirdi.
  expect(requested.some((url) => url.includes("equipment_id=eq-3"))).toBe(true);
});

test("var olmayan ekipman: ekran çökmez, Türkçe hata basar", async ({ page }) => {
  await login(page);
  await page.goto(`${EQUIPMENT_URL}/yok-boyle-bir-ekipman`);

  // 🔴 F-P6 kanonu: e2e'de `getByRole("alert")` KULLANILMAZ — Next.js'in
  // `__next-route-announcer__` öğesi de `role="alert"` taşır ve strict mode
  // ihlaline düşer.
  await expect(page.locator(".makine-det__notice--danger")).toContainText(
    "Ekipman bulunamadı",
  );
});
