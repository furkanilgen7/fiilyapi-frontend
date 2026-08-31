import { readFile } from "node:fs/promises";

import { test, expect, type Page } from "@playwright/test";

import {
  ACCOUNTING_URL,
  CHART_OF_ACCOUNTS_URL,
  TRIAL_BALANCE_URL,
  loginAt,
  ACCOUNTING_READ_TIME,
} from "./accounting-helpers";
import { EQUIPMENT_WORK_URL } from "./equipment-helpers";

/**
 * EXPORT-XLSX · ALTI yeni Excel ucunun UÇTAN UCA kanıtı.
 *
 * Kapsam: düğme → istemci → BFF → sahte backend → tarayıcı indirmesi. Kanıtın
 * özü, adın değil GÖVDENİN sağlam geçmesidir: BFF ikili gövdeyi JSON sanıp
 * bozarsa dosya yine iner ama içeriği çöp olur. `PK\x03\x04` zip (xlsx)
 * imzasıdır — `timesheet.spec.ts::expectXlsxDownload` kanonu birebir.
 *
 * 🔒 SALT-OKUR — RETRY GÜVENLİ. Bu dosya HİÇBİR mutasyon tetiklemez: altı uç da
 * `GET`tir ve sahte backend'de durum DEĞİŞTİRMEZLER. `mock-backend.ts` tek
 * paylaşımlı süreçte koşar ve sıfırlayan ucu YOKTUR (`timesheet.spec.ts`
 * KANONU); mutasyon olmadığı için ada yeniden tohumlamaya GEREK KALMAZ ve
 * retry ilk turun kalıntısıyla düşemez. Bu satır bir varsayım değil, o kanonun
 * bu dosyaya uygulanmış hâlidir — dosyaya bir yazma testi eklenirse
 * `timesheet.spec.ts`teki `beforeEach` yeniden-tohumlama deseni de ŞARTTIR.
 *
 * ⚠️ Akış-SSR çift kopya tuzağı (Linux CI'da fiilen patlar): tekil eleman
 * bekleyen her locator `.first()` alır.
 */

/** Sahte backend'in doğrudan sorgulanacağı port (ikizin REDDİNİ ölçmek için). */
const MOCK_PORT = Number(process.env.MOCK_BACKEND_PORT ?? 4319);

/**
 * İndirilen dosya GERÇEKTEN ikili mi — ad yetmez. Ek olarak dosya adının
 * `.xlsx` ile bittiği doğrulanır (`Content-Disposition` çözümü).
 */
async function expectXlsxDownload(page: Page, testId: string) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId(testId).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".xlsx");
  const path = await download.path();
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
}

async function login(page: Page) {
  await loginAt(page, ACCOUNTING_READ_TIME);
}

test.describe("EXPORT-XLSX · altı ekran gerçekten indirir", () => {
  test("Mizan — 'Excel' iner, 'PDF' hâlâ devre dışı (uçsuz öğe SİLİNMEZ)", async ({ page }) => {
    await login(page);
    await page.goto(TRIAL_BALANCE_URL);
    await expect(page.getByTestId("mz-loaded").first()).toBeAttached();

    await expectXlsxDownload(page, "mz-export-excel");

    // 🔴 PDF/XML kapsam DIŞIDIR ve SİLİNMEZ: devre dışı + GÖRÜNÜR gerekçe.
    await expect(page.getByTestId("mz-export-pdf").first()).toBeDisabled();
    await expect(page.getByTestId("mz-export-reason").first()).toBeVisible();
  });

  test("Hesap Planı — 'Excel' iner", async ({ page }) => {
    await login(page);
    await page.goto(CHART_OF_ACCOUNTS_URL);
    await expect(page.getByTestId("hp-loaded").first()).toBeAttached();

    await expectXlsxDownload(page, "hp-export");
  });

  test("Yevmiye Defteri — 'Excel' iner", async ({ page }) => {
    await login(page);
    await page.goto(ACCOUNTING_URL);
    await expect(page.getByTestId("mu-loaded-ledger").first()).toBeAttached();

    await expectXlsxDownload(page, "mu-export");
  });

  test("Personel — 'Dışa Aktar' iner", async ({ page }) => {
    await login(page);
    await page.goto("/personel");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    await expectXlsxDownload(page, "personel-export");
  });

  test("Bordro Geçmişi — 'Excel İndir' iner ve KAPSAM NOTU görünür", async ({ page }) => {
    await login(page);
    await page.goto("/bordro/gecmis");
    await expect(page.getByTestId("bordro-gecmis-loaded").first()).toBeAttached();

    // 🔴 Dosya ekranda görünen YILDAN GENİŞtir (uç süzgeç almaz); bu SESSİZ
    // geçilmez — kapsam cümlesi düğmenin altında durur.
    await expect(page.getByTestId("bordro-gecmis-export-reason").first()).toContainText(
      "Excel TÜM dönemleri içerir",
    );
    await expectXlsxDownload(page, "bordro-gecmis-export");
  });

  test("Çalışma Kaydı — 'Excel İndir' iner", async ({ page }) => {
    await login(page);
    await page.goto(EQUIPMENT_WORK_URL);
    await expect(page.getByTestId("makine-cal-loaded-summary").first()).toBeAttached();

    await expectXlsxDownload(page, "makine-cal-export");
  });
});

/**
 * 🔴 SIZINTI KAPISI (uçtan uca) — ekranın süzgeci İSTEĞE geçiyor mu?
 *
 * Birim testleri bunu jsdom'da ölçüyor; burada GERÇEK tarayıcı + GERÇEK BFF
 * üzerinden ölçülür: istek yakalanır ve sorgu dizesi okunur.
 */
test.describe("EXPORT-XLSX · istek EKRANIN süzgecini taşır", () => {
  test("şantiye süzgeci seçiliyken Excel isteği site_id taşır", async ({ page }) => {
    await login(page);
    await page.goto(EQUIPMENT_WORK_URL);
    await expect(page.getByTestId("makine-cal-loaded-summary").first()).toBeAttached();

    await page.getByTestId("makine-cal-site-filter").first().selectOption("s-2");
    await expect(page).toHaveURL(/site=s-2/);

    const requestPromise = page.waitForRequest((request) =>
      request.url().includes("/equipment/work-summary/export.xlsx"),
    );
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("makine-cal-export").first().click();
    const request = await requestPromise;
    await downloadPromise;

    const query = new URL(request.url()).searchParams;
    expect(query.get("site_id")).toBe("s-2");
    expect(query.get("year")).not.toBeNull();
    expect(query.get("month")).not.toBeNull();
  });

  test("hesap süzgeci seçiliyken yevmiye Excel isteği account_id taşır", async ({ page }) => {
    await login(page);
    await page.goto(ACCOUNTING_URL);
    await expect(page.getByTestId("mu-loaded-accounts").first()).toBeAttached();

    const select = page.getByTestId("mu-account-filter").first();
    const accountId = await select.locator("option").nth(1).getAttribute("value");
    expect(accountId).toBeTruthy();
    await select.selectOption(accountId as string);

    const requestPromise = page.waitForRequest((request) =>
      request.url().includes("/journal/export.xlsx"),
    );
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("mu-export").first().click();
    const request = await requestPromise;
    await downloadPromise;

    expect(new URL(request.url()).searchParams.get("account_id")).toBe(accountId);
  });
});

/**
 * 🔴🔴 İKİZ BİR ONAYCI DEĞİL BEKÇİDİR.
 *
 * Her zaman 200 diyen bir sahte backend, gerçek backend'in reddettiği bir
 * isteği YEŞİL gösterir. Bu blok ikizin REDDETME davranışını doğrudan (BFF'i
 * atlayarak) ölçer — kimlik, zorunlu parametre, aralık ve enum.
 *
 * ⚠️ MODÜL İZNİ (403) BU İKİZDE MODELLENMİYOR: `mock-backend.ts`te izin/rol
 * mekanizması HİÇ YOKTUR (ölçüldü) ve uydurma bir 403 tetikleyicisi gerçek
 * kapıyı TEMSİL ETMEZDİ. Ekran tarafındaki yetki dalları `/api/auth/me`
 * yanıtı değiştirilerek sınanır (`timesheet.spec.ts` deseni).
 */
test.describe("EXPORT-XLSX · sahte backend GERÇEĞİN reddettiğini reddeder", () => {
  const base = () => `http://127.0.0.1:${MOCK_PORT}`;
  const authed = { headers: { authorization: "Bearer e2e-export-probe" } };

  test("Bearer YOKSA 401 — kimlik kapısı dışa aktarımdan ÖNCE gelir", async ({ request }) => {
    const response = await request.get(
      `${base()}/trial-balance/export.xlsx?year=2026&month=7`,
    );
    expect(response.status()).toBe(401);
  });

  test("mizan: year/month EKSİKSE 422 (gövde ikili DEĞİL, JSON)", async ({ request }) => {
    const response = await request.get(`${base()}/trial-balance/export.xlsx`, authed);
    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({ detail: expect.any(String) });
  });

  test("mizan: month 13 ise 422 (FastAPI ge/le kısıtının ikizi)", async ({ request }) => {
    const response = await request.get(
      `${base()}/trial-balance/export.xlsx?year=2026&month=13`,
      authed,
    );
    expect(response.status()).toBe(422);
  });

  test("çalışma kaydı: year/month EKSİKSE 422", async ({ request }) => {
    const response = await request.get(
      `${base()}/equipment/work-summary/export.xlsx`,
      authed,
    );
    expect(response.status()).toBe(422);
  });

  test("yevmiye: tanınmayan status ENUM'u 422", async ({ request }) => {
    const response = await request.get(
      `${base()}/journal/export.xlsx?year=2026&month=7&status=uydurma`,
      authed,
    );
    expect(response.status()).toBe(422);
  });

  test("hesap planı: tanınmayan account_type ENUM'u 422", async ({ request }) => {
    const response = await request.get(
      `${base()}/chart-of-accounts/export.xlsx?account_type=uydurma`,
      authed,
    );
    expect(response.status()).toBe(422);
  });

  test("personel: tanınmayan source ENUM'u 422", async ({ request }) => {
    const response = await request.get(
      `${base()}/personnel/export.xlsx?source=uydurma`,
      authed,
    );
    expect(response.status()).toBe(422);
  });

  test("geçerli istek xlsx içerik tipi + ikili gövde döner", async ({ request }) => {
    const response = await request.get(
      `${base()}/payroll/periods/export.xlsx`,
      authed,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("spreadsheetml.sheet");
    expect(response.headers()["content-disposition"]).toContain(".xlsx");
    expect([...(await response.body()).subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });
});
