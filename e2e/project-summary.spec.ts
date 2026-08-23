import { test, expect } from "@playwright/test";

/**
 * F-PKK · Proje Özeti + Paylaşım Tablosu — FONKSİYONEL e2e (görsel DEĞİL).
 *
 * Test adında "gorsel" GEÇMEZ: 5. kapı bu dosyayı `--grep-invert "gorsel"`
 * ile DIŞLAMAZ, yani bu iddialar fonksiyonel turda koşar.
 *
 * 🔴 PLAYWRIGHT FAIL-FAST: kırılan iddiadan SONRAKİLER o koşuda HİÇ koşmaz —
 * bu yüzden her test tek bir konuya bakar, hepsi tek dev teste yığılmaz.
 */
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test.describe("Proje Özeti (KY · p-2)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/projeler/p-2/ozet");
    await expect(page.getByRole("heading", { level: 1, name: "Villa B" })).toBeVisible();
  });

  test("maliyet kirilimi sunucunun toplamini basar", async ({ page }) => {
    const card = page.getByRole("region", { name: "Maliyet Kırılımı" });
    await expect(card).toBeVisible();
    // Arsa + inşaat GERÇEK tutarlardır.
    await expect(card).toContainText("8.400.000");
    await expect(card).toContainText("10.240.000");
    // Toplam SUNUCUDAN gelir; satırların istemcide toplanmasıyla DEĞİL.
    await expect(card).toContainText("18.640.000");
  });

  test("bos zarflarin UCU DE gorunur gerekce basar (title yetmez)", async ({ page }) => {
    const card = page.getByRole("region", { name: "Maliyet Kırılımı" });
    // `permits`/`marketing` → accounting · `financing` → treasury.
    // Bu metinler BU dilimde `pending-modules`a eklendi; eklenmeselerdi
    // ekranda genel yedek ("İlgili modülle birlikte gelir") görünürdü.
    await expect(card).toContainText("gider hesapları projeye kırılmıyor");
    await expect(card).toContainText("kredi ve faiz projeye kırılmıyor");
    await expect(card).not.toContainText("İlgili modülle birlikte gelir");
  });

  test("KY tablosunda 'Bekleyen' sutunu VAR, 'Durum' YOK", async ({ page }) => {
    const table = page.getByRole("region", { name: "Taşeron Hakedişleri" });
    await expect(table.getByRole("columnheader", { name: "Bekleyen" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Durum" })).toHaveCount(0);
    await expect(table).toContainText("Akın İnşaat");
    // tfoot sunucunun toplamı.
    await expect(table).toContainText("12.600.000");
  });

  test("kar projeksiyonu ve basabas gerekcesi basilir", async ({ page }) => {
    const card = page.getByRole("region", { name: "Kâr Projeksiyonu" });
    await expect(card).toContainText("48.200.000");
    await expect(card).toContainText("18.400.000");
    // KY 190-193 kartı SİLİNMEDİ, gerekçesiyle duruyor.
    await expect(card).toContainText("Başabaş noktası hesaplanmıyor");
  });

  test("hero'da 'Insaat Ilerlemesi' ve 'Nakit Durumu' gerekceli bos basar", async ({ page }) => {
    const hero = page.getByTestId("psum-hero");
    await expect(hero).toContainText("hakediş yüzdesi proje düzeyine toplanmıyor");
    await expect(hero).toContainText("maliyet ucu nakit taşımaz");
  });
});

test.describe("Proje Özeti (KK · p-3)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/projeler/p-3/ozet");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bahçelievler Konut" }),
    ).toBeVisible();
  });

  test("KK tablosunda 'Durum' sutunu BASILMAZ ve gerekcesi gorunur", async ({ page }) => {
    const table = page.getByRole("region", { name: "Taşeron Hakedişleri" });
    await expect(table.getByRole("columnheader", { name: "Durum" })).toHaveCount(0);
    // KK'da `Bekleyen` de yoktur (mockup öyle çizer).
    await expect(table.getByRole("columnheader", { name: "Bekleyen" })).toHaveCount(0);
    await expect(table).toContainText("Sözleşme durumu maliyet satırından gelmiyor");
  });

  /**
   * 🔴 BU DİLİMİN EN İNCE DALI. `sc-fx-6` sözleşmesinin bedeli `0`dır, yani
   * `progress_pct` **null** gelir ve ekran `%0` DEĞİL `—` basmalıdır. Sahte
   * bir `%0` "veri yok"u "ilerleme yok" diye gösterirdi.
   */
  test("bedeli SIFIR sozlesmede ilerleme '%0' degil '—' basar", async ({ page }) => {
    const row = page.getByRole("row", { name: /Kardeş Su/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText("—");
    await expect(row).not.toContainText("%0");
    // Bedeli olup ÖDEME görmemiş sözleşme ise GERÇEK %0 basar (ayrı hâl).
    await expect(page.getByRole("row", { name: /Yılmaz Elektrik/ })).toContainText("%20");
  });

  test("kat karsiligi hero'sunda arsa maliyeti GERCEK sifirdir", async ({ page }) => {
    const hero = page.getByTestId("psum-hero");
    await expect(hero).toContainText("Paylaşım Oranı");
    await expect(hero).toContainText("Arsa Maliyeti");
  });
});

test.describe("Paylaşım Tablosu (KKP · p-3)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/projeler/p-3/paylasim");
    await expect(page.getByRole("heading", { level: 1, name: "Paylaşım Tablosu" })).toBeVisible();
  });

  test("unite tablosu yedi sutunla basilir", async ({ page }) => {
    const table = page.getByRole("region", { name: "Ünite Bazlı Paylaşım" });
    for (const header of [
      "Ünite",
      "Tip",
      "m²",
      "Rayiç Değer",
      "Sahip",
      "Hissedar / Alıcı",
      "Satış Durumu",
    ]) {
      await expect(table.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }
  });

  /**
   * 🔴 TEK ENUM YETMEZ: "Arsa Sahibinde" `UnitSalesStatus` kümesinde YOKTUR,
   * `owner_side` türevidir. Arsa sahibinin ünitesi satış durumu ne olursa
   * olsun "Satışta"/"Satıldı" BASMAZ (KK 170: kendi payını kendisi satar).
   */
  test("arsa sahibinin unitesi 'Arsa Sahibinde' basar", async ({ page }) => {
    const table = page.getByRole("region", { name: "Ünite Bazlı Paylaşım" });
    await expect(table.getByText("Arsa Sahibinde").first()).toBeVisible();
  });

  test("teslim takibi karti SILINMEDI, gerekcesiyle duruyor", async ({ page }) => {
    const card = page.getByRole("region", { name: "Arsa Sahibi Teslim Takibi" });
    await expect(card).toContainText("kat karşılığı özeti teslim adımı taşımaz");
    // Kartın tek GERÇEK sayısı günlük cezadır ve BASILIR.
    await expect(card).toContainText("Gecikme Cezası");
    await expect(card).toContainText("Gecikme riski hesaplanmıyor");
  });

  /**
   * 🔴 K3 · İNDİRME AKIŞI BFF'TEN GEÇER ve `documents` indirmesinde daha önce
   * YALNIZ CANLIDA çıkan bir kırık yaşandı (F-BC dersi) — jsdom bunu görmez,
   * bu yüzden akış BURADA (gerçek tarayıcı + gerçek BFF) ölçülür.
   */
  test("Excel dugmesi BFF uzerinden dosya indirir", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excel" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("paylasim-PRJ-3.xlsx");
  });
});

test.describe("Sekme şeridi — tür bazlı (K1)", () => {
  test("taahhut projesinde iki yeni sekme YOKTUR", async ({ page }) => {
    await login(page);
    await page.goto("/projeler/p-1");
    const tabs = page.getByRole("tablist", { name: "Proje detay sekmeleri" });
    await expect(tabs.getByRole("tab")).toHaveCount(5);
    await expect(tabs.getByRole("tab", { name: "Proje Özeti" })).toHaveCount(0);
    await expect(tabs.getByRole("tab", { name: "Paylaşım Tablosu" })).toHaveCount(0);
  });

  test("kat karsiligi projesinde iki sekme de GERCEK rotaya gider", async ({ page }) => {
    await login(page);
    await page.goto("/projeler/p-3");
    const tabs = page.getByRole("tablist", { name: "Proje detay sekmeleri" });
    await expect(tabs.getByRole("tab")).toHaveCount(7);

    await tabs.getByRole("tab", { name: "Paylaşım Tablosu" }).click();
    await expect(page).toHaveURL(/\/projeler\/p-3\/paylasim$/);
    // Ölü sayfa (catch-all ComingSoon) DEĞİL.
    await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);
  });
});
