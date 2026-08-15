import { expect, type Page } from "@playwright/test";

/**
 * F-MU1 T5 · Muhasebe e2e'lerinin ORTAK kurulumu.
 *
 * `equipment-helpers.ts` / `treasury-helpers.ts` emsali: dönem sabitleri ve
 * giriş akışı TEK yerde yaşar; fonksiyonel spec ile T6'nın görsel spec'i aynı
 * takvime bakar. İki dosya kendi tarihini yazsaydı, biri fikstür ayını kaçırıp
 * BOŞ bir ekran ölçerdi ve bunu kimse fark etmezdi.
 */

export const ACCOUNTING_URL = "/muhasebe";
export const CHART_OF_ACCOUNTS_URL = "/muhasebe/hesap-plani";

/**
 * 📅 OKUMA AYI — mock backend'in defter/özet fikstürleri YALNIZ burada
 * (E8:74 `Temmuz 2026`). Ekranın varsayılan dönemi YEREL takvimden gelir
 * (`currentPeriod(new Date())`), bu yüzden saat DONDURULUR: dondurulmasaydı
 * gerçek ay geldiğinde tablo boş iner ve test/kadraj sessizce anlamsızlaşırdı.
 */
export const ACCOUNTING_READ_TIME = new Date("2026-07-20T09:00:00");

/**
 * 🔒 YAZMA AYI — mutasyon adası (mock backend `ACCOUNTING_MUTATION_PERIOD`).
 *
 * İzolasyon ZAMANLAMAYA DEĞİL YAPIYA dayanır: defter/özet/fiş uçlarının hepsi
 * DÖNEM süzgeçlidir, dolayısıyla burada yaratılan/kayıtlaştırılan/silinen
 * hiçbir kayıt Temmuz'un kadrajına giremez — `fullyParallel` altında dosya
 * içi sıra bile garanti değilken tek güvenli ayrım budur.
 */
export const ACCOUNTING_WRITE_TIME = new Date("2026-06-20T09:00:00");

export async function loginAt(page: Page, fixedTime: Date) {
  // Saat NAVİGASYONDAN ÖNCE kurulur (F-SD/F-FAT2 yöntemi).
  await page.clock.setFixedTime(fixedTime);
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** `/muhasebe` — DÖRT kaynağın hepsi inene kadar bekler (T2'nin damgaları). */
export async function openAccounting(page: Page, fixedTime = ACCOUNTING_READ_TIME) {
  await loginAt(page, fixedTime);
  await page.goto(ACCOUNTING_URL);
  await expect(page.getByTestId("mu-loaded-summary")).toBeAttached();
  await expect(page.getByTestId("mu-loaded-ledger")).toBeAttached();
  await expect(page.getByTestId("mu-loaded-drafts")).toBeAttached();
  await expect(page.getByTestId("mu-loaded-accounts")).toBeAttached();
}

export async function openChartOfAccounts(page: Page, fixedTime = ACCOUNTING_READ_TIME) {
  await loginAt(page, fixedTime);
  await page.goto(CHART_OF_ACCOUNTS_URL);
  await expect(page.getByTestId("hp-loaded")).toBeAttached();
}
