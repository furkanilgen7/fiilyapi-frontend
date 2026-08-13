import { test, expect, type Page } from "@playwright/test";

import { EMPTY_SALES_LIST_RESPONSE, EMPTY_SALES_SUMMARY_RESPONSE } from "./mock-backend";
import { prepareFrame } from "./visual-scroll";

// F-P8 T4 · SY (`/satis`) Satış Yönetimi listesi — BOŞ görsel kadrajı.
// `stock-catalog-visual.spec.ts` "bos" testinin deseni.
//
// BOŞ DURUM KAYNAĞI (F-PL/F-ST emsali): paylaşılan mock durumu BOŞALTILMAZ —
// başka spec'lerin fikstürlerini (ve `satis-listesi.png` baseline'ını) sessizce
// kırardı. Yerine varsayılan `p-1` projesinin İKİ GET ucu (`.../sales` ve
// `.../sales/summary`) kadraja özel olarak `EMPTY_SALES_*` sabitleriyle
// karşılanır; sunucu durumu HİÇ değişmez → yarış yoktur.
//
// 📅 TARİH BAĞIMSIZ: boş yanıtlarda bugüne bağlı türev yok — `page.clock`
// gerekmez.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const SALES_URL = "/satis";

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("satis yonetimi listesi (bos) gorsel", async ({ page }) => {
  // Süzgeçsiz + sayfasız liste ucu → boş liste yanıtı (durum değişmez).
  await page.route("**/projects/*/sales", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_SALES_LIST_RESPONSE),
    });
  });
  // Summary ucu → sıfır KPI yanıtı (durum değişmez).
  await page.route("**/projects/*/sales/summary", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_SALES_SUMMARY_RESPONSE),
    });
  });

  await login(page);
  await page.goto(SALES_URL);
  await expect(page.getByRole("heading", { name: "Satış Yönetimi", level: 1 })).toBeVisible();

  // YERLEŞİM OTURDU (WORKFLOW §4, 1. parça): boş-durum kartı basıldı — "Satış
  // listesi yükleniyor…" iskeleti kadraja giremez. `.first()` ZORUNLU:
  // akış-SSR'da sunucu kopyası + hidrasyon kopyası bir an yan yana durur ve
  // strict-mode ihlali verir (F-PL/F-ST baseline dersi, yalnız Linux CI'da
  // patlar).
  await expect(page.getByTestId("satis-bos-durum").first()).toContainText(
    "henüz satış kaydı yok",
  );
  // KPI şeridi sıfırları SUNUCUDAN gelir (yükleme "—" hâli değil): `₺` basılı.
  await expect(page.getByTestId("satis-kpi-strip")).toContainText("₺");
  // Boş listede tfoot toplamı BASILMAZ.
  await expect(page.getByTestId("satis-toplam")).toHaveCount(0);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("satis-listesi-bos.png", { fullPage: true });
});
