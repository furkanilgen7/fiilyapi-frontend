import { test, expect, type Page } from "@playwright/test";

import { settleScrollTop } from "./visual-scroll";

// F-PT T5 · Puantaj görsel testleri — mockup'lar `Ekran 5 - Puantaj.dc.html`
// (E5, genel) ve `Şantiye - Puantaj.dc.html` (ŞP, şantiye sekmesi).
// `site-planning-visual.spec.ts` / `site-diary-visual.spec.ts` deseninin aynısı.
//
// SALT-OKUR: bu dosya hiçbir PUT tetiklemez. Popover kadrajı bile YALNIZ açar
// (Uygula'ya basmaz), yani paylaşılan fikstür DEĞİŞMEZ ve `fullyParallel`
// altında `timesheet.spec.ts` ile yarışmaz — o dosyanın mutasyonları AYRI ayda
// (2026-09) yürür, buradaki kadrajlar 2026-08'e bakar.
//
// ⚠️ AMA KENDİ SALT-OKURLUĞUMUZ YETMEZ (ilk baseline turunda fiilen yakalandı,
// run 31219400575): matris satırları `GET /personnel`ten gelir ve o kartoteks
// GLOBALDİR — `personnel-form.spec.ts`in POST ettiği "Zeki Karaca" kadraja
// SIZDI. Ay ayırmak burada KORUMAZ, çünkü kartoteks döneme bağlı değildir ve
// `fullyParallel` altında dosya sırası garanti değildir; baseline sıraya bağlı
// olarak kâh Zeki'li kâh Zeki'siz üretilirdi (kaçınılmaz görsel CI kırmızısı).
// Çözüm `pinRoster`: kadrajlar kartoteksi SABİTLER (bkz. aşağısı).
//
// 📅 AY SABİTLEME (F-PL/F-SD dersi): ekranların varsayılan dönemi İÇİNDE
// BULUNULAN aydır. Kadrajlar bu yüzden AÇIK `?year=&month=` ile kurulur —
// aksi hâlde her ay başında gün sütunları/başlık değişir ve baseline
// KENDİLİĞİNDEN kırmızıya döner. `page.clock` gerekmez: dönem parametreyle
// verildiğinde ekranda tarihe bağlı başka türev kalmaz.
//
// Kadrajlar mock-backend'in 2026-08 · s-1 kümesine bakar: beş kodun HEPSİ,
// saatli FM, `4+` ve `3G` ayak işaretleri o kümededir. Uzun/rastgele mock
// metni kadraja SOKULMAZ (F-SD dersi).
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

/** Kadraj dönemi — mock fikstürlerinin zengin ayı. */
const AUGUST = "year=2026&month=8";
const SITE_URL = `/projeler/p-1/santiyeler/s-1/puantaj?${AUGUST}`;
const GENERAL_URL = `/puantaj?site=s-1&${AUGUST}`;

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * Kartoteksi kadraj için SABİTLER: başka spec'lerin POST ettiği personel
 * (`per-new-*`) listeden düşürülür, TOHUM fikstürler (`per-1…`) aynen kalır.
 *
 * TEK UÇ değiştirilir ve paylaşılan mock durumuna DOKUNULMAZ
 * (`timesheet.spec.ts`in `/api/auth/me` deseninin aynısı) — yani bu kadrajlar
 * `personnel-form.spec.ts`in ne zaman/hangi sırada koştuğundan YAPISAL olarak
 * bağımsızdır. Süzgeç KİMLİK tabanlıdır, ad tabanlı değil: ileride başka bir
 * spec farklı bir ad POST etse de kadraj değişmez.
 */
async function pinRoster(page: Page) {
  await page.route("**/api/backend/personnel*", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      items: { id: string }[];
      total: number;
      limit: number;
      offset: number;
    };
    const items = body.items.filter((item) => !item.id.startsWith("per-new-"));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...body, items, total: items.length }),
    });
  });
}

/**
 * Matris gerçekten doldu mu — yükleme durumu dondurulmasın.
 *
 * ⚠️ `.first()` ZORUNLU: akış-SSR sırasında sunucudan gelen ve hidrasyonla
 * eklenen KOPYA kısa bir an yan yana durur; kapsam daraltmadan yapılan
 * `getByText` strict-mode ihlali verir (F-PL T5'te YALNIZ Linux CI'da patladı).
 */
async function expectMatrixLoaded(page: Page) {
  await expect(page.locator(".ts-table").first().locator("tbody tr")).not.toHaveCount(0);
  await expect(page.locator(".ts-table .ts-cell").first()).toBeVisible();
}

test("genel puantaj (E5) matrisi gorsel", async ({ page }) => {
  await login(page);
  await pinRoster(page);
  await page.goto(GENERAL_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Puantaj" }).first()).toBeVisible();
  await expectMatrixLoaded(page);

  // E5'in AYRI "Meslek" kolonu + DÖRTLÜ legend (G yok) kadrajdadır.
  await expect(page.getByRole("columnheader", { name: "Meslek" }).first()).toBeVisible();
  await expect(
    page.locator(".ts-legend--general").first().locator(".ts-legend__item"),
  ).toHaveCount(4);
  // Şantiye seçici çözüldü — "Yükleniyor…" durumu baseline'a girmesin.
  await expect(page.getByLabel("Şantiye").first()).toBeEnabled();

  await expect(page).toHaveScreenshot("puantaj-genel.png", { fullPage: true });
});

test("santiye puantaji (SP) matrisi gorsel", async ({ page }) => {
  await login(page);
  await pinRoster(page);
  await page.goto(SITE_URL);
  await expect(
    page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi — Puantaj" }).first(),
  ).toBeVisible();
  await expectMatrixLoaded(page);

  // ŞP farkları kadrajda: BEŞLİ legend, Tür rozeti, bölüm özet şeridi ve
  // ayak satırının `4+` / `3G` işaretleri.
  await expect(
    page.locator(".ts-legend--site").first().locator(".ts-legend__item"),
  ).toHaveCount(5);
  await expect(page.locator(".ts-summary__title").first()).toHaveText("Tüm Bölümler");
  await expect(
    page.locator(".ts-table__foot-row").first().getByText("4+", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".ts-table__foot-row").first().getByText("3G", { exact: true }),
  ).toBeVisible();
  // Beş kod rozetinin hepsi kadrajda — palet baseline'a tam giriyor.
  for (const modifier of ["worked", "leave", "holiday", "overtime", "temporary-duty"]) {
    await expect(page.locator(`.ts-table .ts-cell--${modifier}`).first(), modifier).toBeVisible();
  }

  await expect(page).toHaveScreenshot("puantaj-santiye.png", { fullPage: true });
});

test("puantaj hucre popover'i gorsel", async ({ page }) => {
  await login(page);
  await pinRoster(page);
  await page.goto(SITE_URL);
  await expectMatrixLoaded(page);

  // DOLU bir FM hücresi seçilir: kadraj hem SEÇİLİ rozetin basılı durumunu
  // hem de yalnız FM'de açılan saat alanını taşır.
  await page
    .locator(".ts-table")
    .first()
    .getByRole("button", { name: "Ramazan Yıldız · 3 Ağu puantajı" })
    .click();
  const popover = page
    .getByRole("dialog", { name: "Ramazan Yıldız · 3 Ağu — puantaj hücresi" })
    .first();
  await expect(popover.locator(".ts-pop__code")).toHaveCount(5);
  await expect(popover.getByLabel("Fazla mesai saati")).toHaveValue("3");
  await expect(popover.getByRole("button", { name: "Temizle" })).toBeVisible();

  // Tıklama kaydırmış olabilir — kabuk ofsetli basılmasın (bkz. `visual-scroll.ts`).
  // ⚠️ F-P10'un GERÇEK kusuru tam burada çıktı: hücre `.ts-table-scroll`ün
  // İÇİNDE olduğu için tıklama pencereyi değil O KABI, üstelik YATAY eksende
  // kaydırıyordu — korkuluğun eleman kaplarını da kapsaması bu yüzden ŞART.
  // Geometri denetiminden ÖNCE yapılır ki iddia, kadraja GİREN durumu ölçsün.
  await settleScrollTop(page);
  await expect(popover).toBeVisible();

  // ⚠️ KIRPILMA DENETİMİ (T3'ün açık bıraktığı soru, T5'te GERÇEK KUSUR
  // çıktı): `.ts-table-scroll { overflow-x: auto }` dikey ekseni de `auto`ya
  // çevirdiği için popover kabın İÇİNDE kesiliyordu. `escapeOverflow` ile
  // yüzey artık `position: fixed`tir; aşağıdaki iddia kırpılmanın geri
  // gelmesini yakalar.
  // Ramazan Yıldız matrisin SON satırıdır — kırpılma tam orada ölçülmüştü.
  const geometry = await popover.evaluate((node) => {
    const scroll = node.closest(".ts-table-scroll");
    const box = node.getBoundingClientRect();
    return {
      position: getComputedStyle(node).position,
      isWithinViewport: box.top >= 0 && box.bottom <= window.innerHeight,
      // Kırpan kap popover yüzünden dikey kaydırma KAZANMAMALI (kusurdan önce
      // 428px içerik / 364px kap ölçülmüştü).
      hiddenHeight: scroll === null ? -1 : scroll.scrollHeight - scroll.clientHeight,
    };
  });
  expect(geometry).toEqual({ position: "fixed", isWithinViewport: true, hiddenHeight: 0 });

  await expect(page).toHaveScreenshot("puantaj-hucre-popover.png", { fullPage: true });
});
