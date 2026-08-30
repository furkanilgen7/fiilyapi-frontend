import { test, expect, type Page } from "@playwright/test";

/**
 * URL-3 · SLUG'LI URL'İN UÇTAN UCA BEKÇİSİ.
 *
 * KÖK OLAY: kullanıcı canlıda `/projeler/049e058b-…` adresini gösterip
 * *"düzeltebilir miyiz"* dedi. Hedef `/projeler/kopru-guclendirme`.
 *
 * 🔴 BU DOSYA NEYİ ÖLÇER: yol segmentinin okunur olması TEK BAŞINA yetmez.
 * Slug'ı kabul eden **yalnız üç** okuma ucu vardır; kalan **42** yol
 * parametresi UUID bekler. Yani slug'lı bir adreste ekran, kimliği detay
 * yanıtından çözüp alt sorgulara KANONİK UUID vermezse YARIM AÇILIR — hero
 * gelir, listeler 422/404 alır. Birim testleri bu geçişi göremez (hook'ları
 * mock'larlar); ancak gerçek ağ üzerinden gezinen bu dosya görür.
 *
 * ÜÇ POZİTİF KONTROL (emrin şartı):
 *   (a) slug'lı URL AÇILMALI
 *   (b) 🔴 UUID'li URL DE AÇILMALI — kullanıcının bookmark'ları bozulmaz;
 *       bu pazarlık konusu değildir ve yönlendirme (redirect) YOKTUR
 *   (c) `slug`ı NULL olan kayıt UUID'siyle çalışmalı (sütun NULLABLE)
 *
 * Fikstür (`mock-backend.ts`): p-1 = `kule-a` · s-1 = `a-blok-santiyesi` ·
 * sec-1 = `kat-6-10-kaba-insaat` · **sec-3 = `slug: null`** (kayıt id'siyle yaşar).
 *
 * ⚠️ KİMLİKLER SLUG'DAN FARKLI SEÇİLDİ ve bu bilinçlidir: ikizin kimlikleri
 * zaten `p-1` gibi UUID olmayan dizelerdir. Slug'ı kimliğe EŞİT verseydik
 * "ekran slug'ı mı kimliği mi kullandı" AYIRT EDİLEMEZDİ — her iddia eşdeğer
 * mutant olurdu.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test.describe("URL-3 · slug'li adres", () => {
  test("(a) POZITIF KONTROL — slug'li proje URL'i ACILIR ve SANTIYE LISTESI DOLAR", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/projeler/kule-a");

    // Hero: slug'i KABUL EDEN uctan geldi.
    await expect(page.getByRole("heading", { level: 1, name: /Kule A/ })).toBeVisible();

    // 🔴 ASIL IDDIA: santiye izgarasi `GET /projects/{id}/sites` ucundan gelir
    // ve o uc UUID BEKLER. Ekran slug'i kanonik kimlige cozmeseydi BURASI bos
    // kalirdi — hero dolu, liste bos: tam olarak "yarim acilan ekran".
    await expect(page.getByTestId("site-list-grid")).toBeVisible();
    await expect(page.getByText("A-Blok Şantiyesi")).toBeVisible();

    // Adres slug'li KALIR (yonlendirme YOK).
    expect(page.url()).toContain("/projeler/kule-a");
  });

  test("(b) POZITIF KONTROL — ESKI UUID/id URL'i de ACILIR (bookmark'lar olmez)", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/projeler/p-1");

    await expect(page.getByRole("heading", { level: 1, name: /Kule A/ })).toBeVisible();
    await expect(page.getByTestId("site-list-grid")).toBeVisible();
    await expect(page.getByText("A-Blok Şantiyesi")).toBeVisible();

    // 🔴 YONLENDIRME YOK: adres kullanicinin geldigi bicimde KALIR.
    expect(page.url()).toContain("/projeler/p-1");
    expect(page.url()).not.toContain("kule-a");
  });

  test("liste kartindan detaya GIRIS slug'li adres uretir", async ({ page }) => {
    await login(page);
    await page.goto("/projeler");
    await page.getByRole("link", { name: /Kule A projesini aç/ }).click();
    // Kullanicinin GORDUGU degisiklik: adres artik okunur.
    await expect(page).toHaveURL(/\/projeler\/kule-a$/);
  });

  test("SANTIYE ve BOLUM zinciri de slug tasir ve UUID bekleyen uclar dolar", async ({ page }) => {
    await login(page);
    await page.goto("/projeler/kule-a/santiyeler/a-blok-santiyesi");
    await expect(page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi" })).toBeVisible();
    // Bolum listesi santiye yanitindan gelir — zincirin ikinci basamagi.
    await expect(page.getByText("Kat 6–10 Kaba İnşaat")).toBeVisible();

    // 🔴 IS KALEMLERI: `GET /sites/{id}/boq` UUID BEKLER. Slug'li adreste bu
    // sekmenin dolmasi, gecis noktasinin GERCEKTEN calistiginin kanitidir.
    await page.goto("/projeler/kule-a/santiyeler/a-blok-santiyesi/is-kalemleri");
    await expect(page.getByRole("heading", { level: 1, name: "İş Kalemleri (BOQ)" })).toBeVisible();
    // 🔴 BASLIK YETMEZ — o statik metindir ve cozumleme kirikken de basilir.
    // TABLONUN ICERIGI olculur: bu satirlar `GET /sites/{id}/boq` ucundan
    // gelir ve o uc UUID BEKLER (`boq-visual.spec.ts` ile ayni capalar).
    await expect(page.getByText("İç Sıva (Çimento+Alçı)")).toBeVisible();
    await expect(page.getByText("12.399.900")).toBeVisible();

    // Bolum detayi: kapsam IKI BASAMAKLI (`?site=` + `?project=`).
    await page.goto("/projeler/kule-a/santiyeler/a-blok-santiyesi/bolumler/kat-6-10-kaba-insaat");
    // 🔴 F-KIRINTI: bolum adi artik IKI yerde basilir (ust cubuk yol
    // gostergesi + hero basligi), yani ciplak `getByText` strict-mode ihlali
    // verir. Iddia ZAYIFLATILMADI, KESKINLESTIRILDI: cozumlemenin kanitI
    // basliktir — statik bir metin degil, `?site=`+`?project=` kapsamiyla
    // cozulen KAYDIN adi.
    await expect(
      page.getByRole("heading", { level: 1, name: "Kat 6–10 Kaba İnşaat" }),
    ).toBeVisible();
  });

  test("(c) POZITIF KONTROL — `slug`i NULL olan kayit KIMLIGIYLE yasar", async ({ page }) => {
    await login(page);
    await page.goto("/projeler/kule-a/santiyeler/a-blok-santiyesi");

    // sec-3'un slug'i NULL. `routeKeyOf` `slug ?? id` uyguladigi icin kartin
    // baglantisi kimlige duser. `slug!` yazan bir uygulama burada "undefined"
    // tasiyan BOZUK bir link uretirdi.
    const card = page
      .getByTestId("section-list")
      .locator("li")
      .filter({ hasText: "Peyzaj Düzenlemesi (Taslak)" });
    const link = card.getByRole("link", { name: /Detay/ });
    await expect(link).toHaveAttribute(
      "href",
      "/projeler/kule-a/santiyeler/a-blok-santiyesi/bolumler/sec-3",
    );

    // Ve o link GERCEKTEN acilir: kapsamli cozumleme kimlik dalindan gecer.
    await link.click();
    await expect(page.getByText("Peyzaj Düzenlemesi (Taslak)")).toBeVisible();
  });
});

/**
 * 🔴 AKTİF SEKME — URL-3'ÜN EN SESSİZ KUSURU.
 *
 * `ProjectDetailTabs` / `SiteDetailTabs` aktif sekmeyi `activePath === href`
 * TAM DİZE karşılaştırmasıyla bulur. Şerit "kaydın slug'ını" taşırsa, eski
 * UUID linkiyle gelen kullanıcıda href `/projeler/kule-a`, adres
 * `/projeler/p-1` olur ve HİÇBİR sekme seçili görünmez. 422 yoktur, konsol
 * hatası yoktur — yalnız gözle görülür.
 *
 * BU KUSUR GERÇEKTEN OLDU: ilk yazımda `ProjectHeroBar` `routeKeyOf(project)`
 * geçiriyordu ve görsel kapı yakaladı. Bekçi bu yüzden İKİ ADRES BİÇİMİNİ DE
 * ölçer — biri düzeltilip öteki unutulursa kırmızı verir.
 */
test.describe("URL-3 · aktif sekme HER IKI adres biciminde de isaretlenir", () => {
  for (const [bicim, url] of [
    ["slug", "/projeler/kule-a"],
    ["UUID/id (eski link)", "/projeler/p-1"],
  ] as const) {
    test(`${bicim} adresinde "Şantiyeler" sekmesi aria-selected=true`, async ({ page }) => {
      await login(page);
      await page.goto(url);
      await expect(page.getByTestId("site-list-grid")).toBeVisible();

      const active = page.getByRole("tab", { name: "Şantiyeler" });
      await expect(active).toHaveAttribute("aria-selected", "true");
      // Serit ADRESI izler: href adres bicimiyle AYNI olmalidir.
      await expect(active).toHaveAttribute("href", url);
      // Pozitif kontrol: baska bir sekme secili DEGIL (hepsi true olsaydi
      // yukaridaki iddia bir bekciyi degil bir yanilsamayi dogrulardi).
      await expect(page.getByRole("tab", { name: "İşveren Hakediş" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });
  }

  test("SANTIYE seridi de adresi izler (slug'li rotada aktif sekme kaybolmaz)", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/projeler/kule-a/santiyeler/a-blok-santiyesi/stok");
    const active = page.getByRole("tab", { name: "Stok" });
    await expect(active).toHaveAttribute("aria-selected", "true");
    await expect(active).toHaveAttribute(
      "href",
      "/projeler/kule-a/santiyeler/a-blok-santiyesi/stok",
    );
  });
});
