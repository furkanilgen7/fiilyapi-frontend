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
export const TRIAL_BALANCE_URL = "/muhasebe/mizan";
export const VAT_RETURN_URL = "/muhasebe/kdv-beyani";

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

/**
 * 📭 BOŞ AY — YEVMİYE yüzeylerinde hiçbir fikstürün düşmediği dönem (T6
 * boş-durum kadrajı). 🔴 F-MU2 devri: "hiçbir fikstür" artık YALNIZ defter/
 * özet/fiş uçları için doğrudur — Ocak 2026'da bir MİZAN fikstürü (dengesiz)
 * ve bir KDV fikstürü (devreden) VARDIR. İkisi de ayrı uçlardadır, bu yüzden
 * `/muhasebe` kökünün boş kadrajını KİRLETMEZLER.
 *
 * Ocak 2026 seçilir çünkü mock backend'de yalnız İKİ ay doludur: Temmuz
 * (okuma) ve Haziran (mutasyon adası). Boş durumu Haziran'da ölçmek YASAK
 * olurdu (yazma akışları o ayı oynatıyor); `page.route` ile sahte boş yanıt
 * uydurmaya da gerek yoktur — defter/özet/fiş uçlarının HEPSİ dönem
 * süzgeçlidir ve Ocak'ta yapısal olarak boş döner. Kadrajın gördüğü her değer
 * yine SUNUCUDAN gelir.
 */
export const ACCOUNTING_EMPTY_TIME = new Date("2026-01-15T09:00:00");

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

/**
 * 📅 F-MU2 · KDV'nin DEVREDEN dalını gösteren saat.
 *
 * Beyanname ÖNCEKİ ayın beyanıdır (`shiftPeriod(currentPeriod, -1)`), yani bu
 * saatte ekran OCAK 2026'yı gösterir — mock backend'in `carried_forward > 0`
 * fikstürünün durduğu ay. Ayrı bir sabit gerekiyor çünkü `ACCOUNTING_EMPTY_TIME`
 * (Ocak) KDV ekranında ARALIK 2025'e düşerdi.
 *
 * Mizan'ın dengesiz dalı ise `ACCOUNTING_EMPTY_TIME`de ölçülür (o ekranın
 * dönemi kaydırılmaz: Ocak saatinde Ocak mizanı gösterilir).
 */
export const ACCOUNTING_VAT_CARRIED_TIME = new Date("2026-02-10T09:00:00");

/** `/muhasebe/mizan` — TEK veri kaynağı (`GET /trial-balance`). */
export async function openTrialBalance(page: Page, fixedTime = ACCOUNTING_READ_TIME) {
  await loginAt(page, fixedTime);
  await page.goto(TRIAL_BALANCE_URL);
  await expect(page.getByTestId("mz-loaded")).toBeAttached();
}

/** `/muhasebe/kdv-beyani` — TEK veri kaynağı (`GET /vat-return`). */
export async function openVatReturn(page: Page, fixedTime = ACCOUNTING_READ_TIME) {
  await loginAt(page, fixedTime);
  await page.goto(VAT_RETURN_URL);
  await expect(page.getByTestId("kdv-loaded")).toBeAttached();
}

/* ------------------------------------------------------------------ */
/* F-MT T5 · Mali Tablolar (E11 · BL · NA)                             */
/* ------------------------------------------------------------------ */

/**
 * Rotalar. 🔴 Mali tablo ekranları MUHASEBE modülünün izniyle korunur
 * (`ACCOUNTING_PERMISSION_MODULE`) ve dönemleri de aynı takvimden türer —
 * bu yüzden burada, muhasebe helper'larıyla AYNI dosyada yaşarlar. İkinci bir
 * helper dosyası ikinci bir takvim demek olurdu ve bu dosyanın başındaki
 * gerekçe tam olarak bunu yasaklıyor.
 */
export const FINANCIAL_STATEMENTS_URL = "/mali-tablolar";
export const BALANCE_SHEET_URL = "/mali-tablolar/bilanco";
export const CASH_FLOW_STATEMENT_URL = "/mali-tablolar/nakit-akisi";

/**
 * 📅 `ACCOUNTING_READ_TIME`in (20 Temmuz 2026) ürettiği VARSAYILAN değerler.
 *
 * Bilanço `defaultBalanceSheetAsOf` ile içinde bulunulan AYIN SON gününü,
 * nakit akışı `defaultCashFlowPeriod` ile içinde bulunulan AY'ı seçer. Mock
 * backend fikstürleri TAM BU anahtarlara konmuştur; sabitleri burada yazmak,
 * "hangi kareyi ölçüyoruz" sorusunun cevabını tek yerde tutar.
 */
export const BALANCE_SHEET_DEFAULT_AS_OF = "2026-07-31";
export const CASH_FLOW_DEFAULT_YEAR = 2026;
export const CASH_FLOW_DEFAULT_MONTH = 7;

/** 📅 `ACCOUNTING_EMPTY_TIME` (15 Ocak 2026) ⇒ DENGESİZ bilanço günü. */
export const BALANCE_SHEET_IMBALANCED_AS_OF = "2026-01-31";

/** `/mali-tablolar` — E11 kök ekranı; TEK veri kaynağı YOKTUR (hepsi devre dışı). */
export async function openFinancialStatementsHome(page: Page, fixedTime = ACCOUNTING_READ_TIME) {
  await loginAt(page, fixedTime);
  await page.goto(FINANCIAL_STATEMENTS_URL);
  await expect(page.getByTestId("mt-loaded")).toBeAttached();
}

/** `/mali-tablolar/bilanco` — TEK veri kaynağı (`GET /balance-sheet`). */
export async function openBalanceSheet(page: Page, fixedTime = ACCOUNTING_READ_TIME) {
  await loginAt(page, fixedTime);
  await page.goto(BALANCE_SHEET_URL);
  await expect(page.getByTestId("bl-loaded")).toBeAttached();
}

/** `/mali-tablolar/nakit-akisi` — TEK veri kaynağı (`GET /cash-flow-statement`). */
export async function openCashFlowStatement(page: Page, fixedTime = ACCOUNTING_READ_TIME) {
  await loginAt(page, fixedTime);
  await page.goto(CASH_FLOW_STATEMENT_URL);
  await expect(page.getByTestId("na-loaded")).toBeAttached();
}
