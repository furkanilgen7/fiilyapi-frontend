import { test, expect, type Page } from "@playwright/test";

// F-PT T3 · Puantaj fonksiyonel e2e (görsel DEĞİL).
// Kapsam: matrisin okunması, hücre popover'ı (boş hücre dâhil), FM saati,
// Excel indirme ve — bu dilimin EN KRİTİK KANITI — `PUT` KAPSAM KURALI.
//
// ⚠️ KAPSAM KANITI NEDEN BURADA ÇALIŞIR: `mock-backend.ts`in PUT ucu gerçek
// backend gibi DEĞİŞTİRME semantiğini uygular — gövdede geçmeyen hücre
// SİLİNİR. Ekran gövdeyi süzülmüş görünümden kursaydı aşağıdaki "diğer
// bölümün kaydı duruyor" iddiası GERÇEKTEN kırmızı olurdu.
//
// 🔒 FİKSTÜR İZOLASYONU (mock-backend'deki nota göre): 2026-08 · s-1 GÖRSEL
// kadrajdır ve bu dosya onu YALNIZ OKUR. Tüm mutasyonlar 2026-09 · s-1'de
// yürür — orada iki farklı bölümün (sec-1 + sec-2) hücresi bilerek durur.
//
// ⚠️ `getByRole("alert")` bu depoda YASAKTIR — görünür metinle iddia edilir.

/** Görsel kadraj ayı — SALT-OKUR. */
const AUGUST = "year=2026&month=8";
/** Fonksiyonel oyun alanı — iki bölümlü, mutasyonlar burada. */
const SEPTEMBER = "year=2026&month=9";

const SITE_URL = "/projeler/p-1/santiyeler/s-1/puantaj";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** Hücre butonu — akış-SSR'da çift kopya riskine karşı matrise kapsamlanır. */
function cell(page: Page, person: string, dayMonth: string) {
  return page.locator(".ts-table").getByRole("button", { name: `${person} · ${dayMonth} puantajı` });
}

/** Hücreye kod yazar: tıkla → rozet seç → (saat) → Uygula. */
async function setCode(page: Page, person: string, dayMonth: string, code: string, hours?: string) {
  await cell(page, person, dayMonth).click();
  const popover = page.getByRole("dialog", { name: `${person} · ${dayMonth} — puantaj hücresi` });
  await popover.getByRole("button", { name: code }).click();
  if (hours !== undefined) await popover.getByLabel("Fazla mesai saati").fill(hours);
  await popover.getByRole("button", { name: "Uygula" }).click();
  await expect(popover).toBeHidden();
}

async function saveAndExpectSuccess(page: Page) {
  await page.getByRole("button", { name: "Kaydet" }).click();
  const status = page.locator(".ts-save-status");
  await expect(status).toContainText("Puantaj kaydedildi.");
  await expect(status).not.toContainText("çakışma");
}

test.describe("puantaj matrisi (SALT-OKUR, Ağustos)", () => {
  test("şantiye matrisi, legend ve ayak satırı işaretleri basılır", async ({ page }) => {
    await login(page);
    await page.goto(`${SITE_URL}?${AUGUST}`);

    await expect(
      page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi — Puantaj" }),
    ).toBeVisible();
    // ŞP legend'i BEŞ ögedir (E5'in dördünden AYRI — kullanıcı kararı).
    for (const label of ["Çalıştı", "İzin", "Tatil", "Fazla Mesai", "Geçici Görev"]) {
      await expect(page.locator(".ts-legend").getByText(label, { exact: true })).toBeVisible();
    }
    // 03 Ağu: dört kişi çalıştı, biri FM ⇒ "4+" · 04 Ağu: üç çalışan + G ⇒ "3G".
    const footer = page.locator(".ts-table__foot-row");
    await expect(footer.getByText("4+", { exact: true })).toBeVisible();
    await expect(footer.getByText("3G", { exact: true })).toBeVisible();
  });

  test("genel puantaj ekranı (E5) matrisi basar ve Excel indirir", async ({ page }) => {
    await login(page);
    await page.goto(`/puantaj?site=s-1&${AUGUST}`);
    await expect(page.getByRole("heading", { level: 1, name: "Puantaj" })).toBeVisible();
    // E5'te Meslek AYRI kolondur (ŞP'de alt satıra iner).
    await expect(page.getByRole("columnheader", { name: "Meslek" })).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Dışa Aktar" }).click();
    expect((await download).suggestedFilename()).toContain(".xlsx");
  });
});

/**
 * Mutasyon akışları TEK dosyada SIRAYLA koşar: hepsi 2026-09 · s-1 kapsamını
 * yazar ve `PUT` o kapsamın TAMAMINI değiştirir — paralel koşarlarsa
 * birbirlerinin gövdesini ezerlerdi.
 */
test.describe("puantaj düzenleme (MUTASYON, Eylül · s-1)", () => {
  test.describe.configure({ mode: "serial" });

  test("KAPSAM KURALI: bölüm filtresi açıkken kaydet → diğer bölümün kaydı SİLİNMEZ", async ({
    page,
  }) => {
    await login(page);
    // sec-1 süzgeci açık: İsmail Aksoy'un 1 Eyl kaydı (sec-2) EKRANDA YOK.
    await page.goto(`${SITE_URL}?${SEPTEMBER}&section=sec-1`);
    await expect(page.locator(".ts-summary__title")).toHaveText("Kat 6–10 Kaba İnşaat");
    await expect(cell(page, "İsmail Aksoy", "1 Eyl")).toHaveText("");

    // Süzülmüş görünümde bir düzenleme yapıp kaydet.
    await setCode(page, "Mehmet Kılıç", "3 Eyl", "Çalıştı (Ç)");
    await saveAndExpectSuccess(page);

    // Süzgeci kaldır: sec-2'nin hücresi HÂLÂ ORADA. Gövde süzülmüş kümeden
    // kurulsaydı mock bu kaydı SİLERDİ ve bu iddia kırmızı olurdu.
    await page.goto(`${SITE_URL}?${SEPTEMBER}`);
    await expect(cell(page, "İsmail Aksoy", "1 Eyl")).toHaveText("Ç");
    await expect(cell(page, "Mehmet Kılıç", "3 Eyl")).toHaveText("Ç");
    // Sec-1'in dokunulmamış hücresi de duruyor.
    await expect(cell(page, "Hasan Demirci", "2 Eyl")).toHaveText("Ç");
  });

  test("BOŞ hücreye saatli FM girilir ve kalıcı olur", async ({ page }) => {
    await login(page);
    await page.goto(`${SITE_URL}?${SEPTEMBER}`);

    // Osman Şahin'in Eylül'de HİÇ kaydı yok — satırı kartoteksten gelir (K1).
    await expect(cell(page, "Osman Şahin", "4 Eyl")).toHaveText("");
    await setCode(page, "Osman Şahin", "4 Eyl", "Fazla Mesai (FM)", "3,5");
    await expect(page.locator(".ts-save-status")).toContainText("Kaydedilmemiş 1 hücre");
    await saveAndExpectSuccess(page);

    await page.reload();
    await expect(cell(page, "Osman Şahin", "4 Eyl")).toHaveText("FM");
    // ŞP 119 — FM saat toplamı girilen saatten gelir.
    await expect(page.locator(".ts-summary")).toContainText("3,5 saat fazla mesai");
  });

  test("Temizle kaydı SİLER (gövdede geçmeyen hücre silinir)", async ({ page }) => {
    await login(page);
    await page.goto(`${SITE_URL}?${SEPTEMBER}`);
    await expect(cell(page, "Hasan Demirci", "2 Eyl")).toHaveText("Ç");

    await cell(page, "Hasan Demirci", "2 Eyl").click();
    const popover = page.getByRole("dialog", { name: "Hasan Demirci · 2 Eyl — puantaj hücresi" });
    await popover.getByRole("button", { name: "Temizle" }).click();
    await saveAndExpectSuccess(page);

    await page.reload();
    await expect(cell(page, "Hasan Demirci", "2 Eyl")).toHaveText("");
  });

  test("Escape İPTALDİR — taslağa hiçbir şey yazılmaz", async ({ page }) => {
    await login(page);
    await page.goto(`${SITE_URL}?${SEPTEMBER}`);
    await cell(page, "Mehmet Kılıç", "5 Eyl").click();
    const popover = page.getByRole("dialog", { name: "Mehmet Kılıç · 5 Eyl — puantaj hücresi" });
    await popover.getByRole("button", { name: "İzin (İ)" }).click();
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(page.locator(".ts-save-status")).toBeHidden();
    await expect(page.getByRole("button", { name: "Kaydet" })).toBeDisabled();
  });
});
