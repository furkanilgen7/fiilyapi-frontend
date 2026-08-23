import { test, expect } from "@playwright/test";

// F-P6 T4 · Bölüm formu (ekleme + düzenleme) e2e. `playwright.config.ts`
// `fullyParallel: true` — her `test()` bağımsız bir worker'da, KEYFİ SIRADA
// koşabilir (bkz. `progress-payments.spec.ts` üst yorumu, aynı kısıt burada
// da geçerli). Bu yüzden HER test kendi verisini KENDİ İÇİNDE kurar; hiçbir
// test bir öncekinin oluşturduğu kayda bel bağlamaz.
//
// Mutasyon izolasyonu: her iki test de B-Blok Şantiyesi'nde (s-2, project p-1)
// YENİ bölüm(ler) oluşturur — s-1'in sec-1/sec-2/sec-3 fikstürlerine HİÇ
// dokunmaz. `site-detail-visual.spec.ts` yalnız s-1'i, `section-detail(-visual)
// .spec.ts` yalnız sec-1/sec-3'ü (READ-ONLY) çerçeveliyor; s-2'de oluşan yeni
// kayıtlar hiçbir baseline'ın kadrajına girmiyor (project-detail-visual.spec.ts
// s-2'nin adını basar ama bölüm sayısını/list'ini basmaz, grep ile doğrulandı)
// — P7'deki `pp-6` yarışı burada tekrarlanmıyor.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** Alt eylem şeridindeki butonu bulur — topbar'daki aynı isimli butonla çakışmaz. */
function footerButton(page: import("@playwright/test").Page, name: string) {
  return page.locator(".pf-actions").getByRole("button", { name });
}

test("ekleme kipi: zorunlu alan hatalari, taslak/tam ayrimi, tam zincir (olustur -> detay -> duzenle -> kaydet -> detay)", async ({
  page,
}) => {
  await login(page);

  // 1) Boş form + "Bölümü Oluştur" → Türkçe hatalar, mutate ÇAĞRILMAZ (aynı
  // sayfada kalınır).
  await page.goto("/projeler/p-1/santiyeler/s-2/bolumler/yeni");
  await expect(page.getByRole("heading", { level: 1, name: "Yeni Bölüm (Faz) Ekle" })).toBeVisible();
  await footerButton(page, "Bölümü Oluştur").click();
  // Next.js her sayfaya `<div role="alert" id="__next-route-announcer__">` enjekte
  // ediyor; `getByRole("alert")` bu yuzden HER ZAMAN ikinci bir elemana cozuluyor.
  // Genel banner'i kendi sinifiyla hedefle (`SectionForm.tsx:228`).
  await expect(page.locator(".pf-form-error")).toHaveText("Bölüm adı zorunludur.");
  await expect(page.getByRole("heading", { level: 1, name: "Yeni Bölüm (Faz) Ekle" })).toBeVisible();

  // 2) Yalnız ad dolu + "Bölümü Oluştur" → diğer zorunluluklar (yalnız
  // taslak-dışı yolda uygulanır) hâlâ hata verir.
  await page.getByLabel("Bölüm Adı").fill("Peyzaj E2E Test");
  await footerButton(page, "Bölümü Oluştur").click();
  // Düzeltme turu 1: aynı mesaj banner'da (role="alert") DA basılıyor —
  // `getByText(...)` strict-mode ihlali verirdi (iki eleman). Alan hatasını
  // `.field__error` sınıfına SCOPE ederek yalnız ilgili Field'in altındaki
  // paragrafı hedefliyoruz (`Field.tsx:100-104`), banner'ı hariç tutuyoruz.
  await expect(page.locator(".field__error", { hasText: "Bölüm tipi seçiniz." })).toBeVisible();
  await expect(page.locator(".field__error", { hasText: "Bölüm sorumlusu seçiniz." })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Yeni Bölüm (Faz) Ekle" })).toBeVisible();

  // 3) Aynı (yalnız ad dolu) form + "Taslak Kaydet" → BAŞARILI — ayrımın
  // gerçek kanıtı: taslak yolunda tip/sorumlu/tarih/bütçe zorunlu DEĞİL.
  await footerButton(page, "Taslak Kaydet").click();
  await expect(page).toHaveURL(/\/santiyeler\/s-2\/bolumler\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Peyzaj E2E Test" })).toBeVisible();
  await expect(page.getByText("Planlandı", { exact: true })).toBeVisible();

  // 4) Zincirin devamı: "Düzenle" GERÇEK linkle tıklanır (page.goto DEĞİL) —
  // Bölüm Detay → Form bağlantısının kopuk olmadığının kanıtı.
  await page.getByRole("link", { name: "Düzenle" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bölümü Düzenle" })).toBeVisible();
  await expect(page.getByLabel("Bölüm Adı")).toHaveValue("Peyzaj E2E Test");
  await expect(page.getByLabel("Bölüm Tipi")).toHaveValue("");

  // Taslakta boş bırakılan zorunlu alanları doldurup GERÇEK bölüme çevir.
  await page.getByLabel("Bölüm Tipi").selectOption("structural");
  await page.getByLabel("Bölüm Sorumlusu").selectOption("u-2");
  await page.getByLabel("Başlangıç Tarihi").fill("2026-10-01");
  await page.getByLabel("Planlanan Bitiş").fill("2027-03-31");
  await page.getByLabel("Bölüm Bedeli (₺)").fill("500000");
  await footerButton(page, "Kaydet").click();

  // 5) Kaydetme başarılı: detaya GERİ döner (form → detay bağlantısı da
  // kopuk değil), güncel veriler hero'da görünür.
  await expect(page).toHaveURL(/\/santiyeler\/s-2\/bolumler\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Peyzaj E2E Test" })).toBeVisible();
  await expect(page.getByTestId("section-hero-kpi-budget")).toContainText("₺");
});

test("409 kod cakismasi: Bolum Kodu alaninin altinda tek hata, genel banner basilmaz", async ({ page }) => {
  await login(page);

  async function fillRequired(code: string) {
    await page.getByLabel("Bölüm Adı").fill("Temel Kazı");
    await page.getByLabel("Bölüm Kodu").fill(code);
    await page.getByLabel("Bölüm Tipi").selectOption("foundation_infra");
    await page.getByLabel("Bölüm Sorumlusu").selectOption("u-2");
    await page.getByLabel("Başlangıç Tarihi").fill("2026-10-01");
    await page.getByLabel("Planlanan Bitiş").fill("2027-03-31");
    await page.getByLabel("Bölüm Bedeli (₺)").fill("300000");
  }

  // 🔴 KOD DENEME BAŞINA BENZERSİZDİR — "retry zehirlenmesi"ni önler.
  // Sahte backend koşu boyunca TEK süreçtir, koşu başına BİR KEZ tohumlanır ve
  // sıfırlama ucu YOKTUR (bilinçli karar: `mock-backend.ts` "Elenen
  // alternatifler" notu). Bu test 1. adımda GERÇEKTEN bir bölüm oluşturur.
  // Kod SABİT olsaydı zincir şuydu: ilk deneme 1. adımdan SONRA düşerse kayıt
  // state'te KALIR → `playwright.config.ts` `retries: 1` ile gelen retry AYNI
  // süreçte, AYNI kodla koşar → 1. ADIMIN KENDİSİ 409 alır.
  // 🔴 İDDİA BOZULMADI: testin iddiası "AYNI kod ikinci kez reddedilir"dir ve
  // aşağıdaki İKİ adım da `code` değişkeninin AYNI değerini kullanır. Kodun
  // KOŞULAR/DENEMELER ARASI sabit olması iddianın parçası DEĞİLDİR.
  const { workerIndex, retry } = test.info();
  const code = `B2-E2E-${workerIndex}-${retry}`;

  // 1) Kurulum: B-Blok'ta bu kodla bir bölüm oluştur (bu test kendi verisini
  // kendi içinde kurar, başka teste bel bağlamaz).
  await page.goto("/projeler/p-1/santiyeler/s-2/bolumler/yeni");
  await fillRequired(code);
  await footerButton(page, "Bölümü Oluştur").click();
  await expect(page).toHaveURL(/\/santiyeler\/s-2\/bolumler\/[^/]+$/);
  // 🔴 KURULUMUN GERÇEKTEN OLDUĞU AYRICA İDDİA EDİLİR (ÖLÇÜLDÜ — bu satır
  // olmadan adım KÖR BEKÇİYDİ): yukarıdaki `[^/]+` kalıbı `.../bolumler/yeni`
  // dizesini DE eşler, yani oluşturma 409 alıp sayfa `/yeni`de KALSA BİLE URL
  // iddiası yeşil geçerdi. O hâlde kurulum sessizce hiçbir şey kurmaz ve test
  // "409 döner" iddiasını kendi ARTIĞI üzerinde doğrulamış olurdu.
  // Emsal: aynı dosyada `:60-61` ve `:81-82` URL iddiasını hep bir BAŞLIK
  // iddiasıyla destekler; kör kalan TEK yer burasıydı (ardından `goto` gelir).
  await expect(page.getByRole("heading", { level: 1, name: "Temel Kazı" })).toBeVisible();

  // 2) Aynı kodla İKİNCİ bir bölüm oluşturmaya çalış → 409.
  await page.goto("/projeler/p-1/santiyeler/s-2/bolumler/yeni");
  await fillRequired(code);
  await footerButton(page, "Bölümü Oluştur").click();

  const codeField = page.getByLabel("Bölüm Kodu");
  await expect(codeField).toHaveAttribute("aria-invalid", "true");
  const message =
    "Bu bölüm kodu bu şantiyede zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın.";
  await expect(page.getByText(message)).toHaveCount(1);
  // Brief §409: YALNIZ alan hatası — genel banner basılmaz. `getByRole("alert")`
  // kullanilamaz: Next.js'in route announcer'i her sayfada bir `role="alert"` tasir.
  await expect(page.locator(".pf-form-error")).toHaveCount(0);
  // Form gönderilmedi: hâlâ ekleme sayfasındayız.
  await expect(page.getByRole("heading", { level: 1, name: "Yeni Bölüm (Faz) Ekle" })).toBeVisible();
});
