import { test, expect } from "@playwright/test";

import { TREASURY_URL, login } from "./treasury-helpers";

// F-HZ T3.1 · `/hazine` (E9) FONKSİYONEL e2e'si — görsel spec
// `treasury-visual.spec.ts`tedir (dosya/test adında "gorsel" GEÇMEZ ki beşinci
// kapıda koşsun).
//
// Kapsam: kabuk sidebar girişi (ComingSoon DEĞİL) · `is_active` süzgeci +
// IBAN'sız kasa kartı · ton eşiklerinin SATIRA düşüşü · rotası olmayan
// "+ Ödeme Planla" düğmesinin devre-dışı + gerekçeli hâli · `counterparty`
// NULL satırının zarif düşüşü · TB8 bordro satırı (E9:117) ve onun NULL
// karşı tarafının EKSİKLİK SAYILMAMASI.
//
// 🔒 SALT-OKUR: bu dosya hiçbir POST/PATCH tetiklemez; hazine uçlarının üçü de
// GET'tir → `fullyParallel` altında yarış YOKTUR.
//
// ⚠️ `getByRole("alert")` KULLANILMAZ (F-P6 dersi): akış-SSR ikinci bir kopya
// bastığında `alert` rolü çift eşleşir ve test YALNIZ Linux CI'da patlar.

test("kabuk sidebar'ındaki 'Hazine' gerçek ekranı açar (ComingSoon DEĞİL)", async ({ page }) => {
  await login(page);

  await page.getByRole("navigation").getByRole("link", { name: "Hazine" }).first().click();

  await expect(page).toHaveURL(/\/hazine$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hazine" })).toBeVisible();
  // 🔴 Bu dilimin ÖZÜ: rota artık catch-all ComingSoon'a DÜŞMEZ.
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);
  await expect(page.getByTestId("hazine-cards")).toBeVisible();
});

test("kart şeridi AKTİF hesapları basar; IBAN'sız kasa görünen adını gösterir", async ({
  page,
}) => {
  await login(page);
  await page.goto(TREASURY_URL);

  const cards = page.getByTestId("hazine-account-card");
  // Fikstürde DÖRT hesap var, biri pasif — ekran `is_active=true` süzer.
  await expect(cards).toHaveCount(3);
  await expect(page.getByText("Kapatılmış Hesap")).toHaveCount(0);

  // E9:71-73 — IBAN'lı vadesiz.
  const ziraat = page.locator('[data-account-id="ba-1"]');
  await expect(ziraat).toContainText("Ziraat Bank · Vadesiz");
  await expect(ziraat).toContainText("₺ 2.840.500");
  await expect(ziraat).toContainText("TR12 0001 0093 0012 3456 7890");

  // E9:81-83 — IBAN'SIZ kasa: üçüncü satır `display_name`dir, IBAN YOKTUR.
  const kasa = page.locator('[data-account-id="ba-3"]');
  await expect(kasa).toContainText("Yapı Kredi · Kasa");
  await expect(kasa).toContainText("₺ 284.800");
  await expect(kasa).toContainText("Merkez Kasa");
  await expect(kasa).not.toContainText("TR");
  // Künye VAR → eksik-künye ipucu basılmaz.
  await expect(kasa).not.toContainText("IBAN / açıklama girilmemiş");
});

test("nakit akışı kartı dönemi ve iki toplamı SUNUCUDAN basar", async ({ page }) => {
  await login(page);
  await page.goto(TREASURY_URL);

  const panel = page.getByTestId("hazine-cashflow-panel");
  // Başlık `year`/`month` ECHO'sundan gelir, istemci saatinden DEĞİL.
  await expect(panel.getByRole("heading", { name: "Temmuz Nakit Akışı" })).toBeVisible();
  await expect(page.getByTestId("hazine-cashflow-chart")).toBeVisible();
  // T3.0 · E9:103-104 boşluksuz + iki ondalıklı kompakt biçim.
  await expect(panel).toContainText("Giriş ₺4,12M");
  await expect(panel).toContainText("Çıkış ₺3,84M");
});

test("yaklaşan ödeme satırlarının tonu `days_remaining` eşiklerine UYAR", async ({ page }) => {
  await login(page);
  await page.goto(TREASURY_URL);

  const panel = page.getByTestId("hazine-upcoming-panel");
  // Başlıktaki gün sayısı `days` ECHO'sudur, sabit yazılmaz.
  await expect(panel.getByRole("heading", { name: "Yaklaşan Ödemeler (7 Gün)" })).toBeVisible();
  await expect(page.getByTestId("hazine-upcoming-row")).toHaveCount(5);

  // ≤2 gün → danger
  const akin = page.locator('[data-source-id="sp-1"]');
  await expect(akin).toHaveAttribute("data-tone", "danger");
  await expect(akin).toContainText("Akın İnşaat – Hakediş #47");
  await expect(akin).toContainText("19 Temmuz · 2 gün kaldı");
  await expect(akin).toContainText("₺1.016.800");

  // 3-4 gün → warning
  const yilmaz = page.locator('[data-source-id="inv-1"]');
  await expect(yilmaz).toHaveAttribute("data-tone", "warning");
  await expect(yilmaz).toContainText("Yılmaz Elektrik – Fatura #FT-2026-0311");
  await expect(yilmaz).toContainText("3 gün kaldı");

  // ≥5 gün → success
  const demir = page.locator('[data-source-id="inv-2"]');
  await expect(demir).toHaveAttribute("data-tone", "success");
  await expect(demir).toContainText("7 gün kaldı");
});

// F-HZ2 T3 · TB8 üçüncü kaynak. Fikstüre bordro satırı EKLENMEDEN bu kod
// kadraja HİÇ girmiyordu — beşinci kapı boşuna yeşil veriyordu.
test("bordro satırı E9:117'yi basar: karşı taraf adı da '#' de YOK", async ({ page }) => {
  await login(page);
  await page.goto(TREASURY_URL);

  const bordro = page.locator('[data-source-id="pr-1"]');
  // `document_no` "2026-07" bir NUMARA değil DÖNEMdir → ay adına çevrilir.
  await expect(bordro).toContainText("Bordro – Temmuz");
  await expect(bordro).toContainText("20 Temmuz · 3 gün kaldı");
  await expect(bordro).toContainText("₺892.000");
  // Ton MEVCUT eşikten gelir (3 gün → warning); bordroya özel eşik YOKTUR.
  await expect(bordro).toHaveAttribute("data-tone", "warning");

  // 🔴 Bordronun `counterparty`si NULL'dır ama bu EKSİKLİK DEĞİL TANIMdır:
  // ne düşüş metni ne de "kaynak evrakta boş" ipucu basılır.
  await expect(bordro).not.toContainText("Karşı taraf belirtilmemiş");
  await expect(bordro.locator(".hazine-row__title")).not.toHaveAttribute("title", /.+/);
});

test("karşı tarafı BOŞ ödeme zarif düşer ve GÖRÜNÜR bildirim basar", async ({ page }) => {
  await login(page);
  await page.goto(TREASURY_URL);

  // Satır uydurma bir adla DOLDURULMAZ; belirtilmediği yazılır.
  const bosSatir = page.locator('[data-source-id="sp-2"]');
  await expect(bosSatir).toContainText("Karşı taraf belirtilmemiş – Hakediş #48");
  await expect(bosSatir).toHaveAttribute("data-tone", "success");
  await expect(bosSatir.getByTitle(/karşı taraf adı boş/i)).toBeVisible();

  // Sessiz atlama YOK: eksiklik kullanıcıya bildirilir.
  // (`getByRole("alert")` KULLANILMAZ — F-P6 dersi.)
  // 🔴 "1" SAYISI UÇTAN UCA KANIT: fikstürde `counterparty: null` olan İKİ
  // satır vardır (`sp-2` hakediş + `pr-1` bordro); bordro yanlış sayılsaydı
  // burada "2 ödemenin…" yazardı.
  const notice = page.getByTestId("hazine-upcoming-counterparty-notice");
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText("1 ödemenin karşı taraf adı kaynak evrakta boş.");
});

test("'+ Ödeme Planla' DEVRE DIŞIdır ve gerekçesi görünür", async ({ page }) => {
  await login(page);
  await page.goto(TREASURY_URL);

  // F-TH kanonu: rotası olmayan mockup öğesi SİLİNMEZ, devre-dışı basılır.
  const button = page.getByTestId("hazine-plan-payment");
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("title", "Ödeme planlama ucu henüz açılmadı.");
  await expect(page.getByTestId("hazine-plan-payment-reason")).toHaveText(
    "Ödeme planlama ucu henüz açılmadı.",
  );
});
