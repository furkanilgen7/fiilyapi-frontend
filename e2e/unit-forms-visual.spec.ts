import { test, expect, type Page } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-UNIT1 T6 · BE (`/satis/blok-ekle`) ve UE (`/satis/unite-ekle`) görsel
// kadrajları. Kanonik mockup'lar: `projedesign/Form - Blok Ekle.dc.html` ve
// `projedesign/Form - Unite Ekle.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer; içermeyen bir görsel test
// fonksiyonel turda baseline'sız koşar ve KIRMIZI olur.
//
// 🔒 SALT-OKUR: iki form yalnız AÇILIR, GÖNDERİLMEZ — hiçbir POST tetiklenmez,
// paylaşılan mock durumu değişmez, komşu baseline'lar güvende.
//
// ⏱️ SAAT SABİTLEME GEREKMEZ (ölçüldü): `block-form/`, `unit-form/` ve
// `unit-shell/` altında `new Date()` / `isoDate` / bugüne bağlı varsayılan
// HİÇ YOKTUR — BE 100 "Tahmini Teslim Tarihi" boş açılır. Kıyas:
// `stock-entry-visual.spec.ts`te "Giriş Tarihi" bugünle dolduğu için
// `page.clock` ZORUNLUYDU. Burada kadraj takvime göre KAYMAZ.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

// ---------------------------------------------------------------------------
// 1) BE · Yeni Blok Ekle — mockup'ın çizdiği varsayılan hâl
// ---------------------------------------------------------------------------
test("blok ekle formu gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/blok-ekle?proje=p-1");
  await expect(page.getByRole("heading", { name: "Yeni Blok Ekle", level: 1 })).toBeVisible();

  // YERLEŞİM OTURDU (WORKFLOW §4, 5. parça) — "veri geldi" damgası yetmez,
  // ekrana BASTIĞI ayrıca ölçülür:
  // (a) proje listesi geldi → seçici kilitli DEĞİL,
  await expect(page.getByTestId("blok-form-proje")).toBeEnabled();
  // (b) şantiye seçicisi o projenin şantiyesiyle doldu (kademeli süzme çalıştı),
  await expect(page.getByTestId("blok-form-santiye")).toBeEnabled();
  // (c) BE 88-94 tahmin bandı basıldı; üç girdi de boş olduğu için sayı YOK
  //     (backend `estimated_unit_count` kuralı: hepsi boşsa null, "0" DEĞİL),
  await expect(page.getByTestId("blok-form-tahmin")).toBeVisible();
  // (d) BE 107-110 toplu üretim kutusu ARTIK ETKİN (F-UNIT2 T2c): hedefi
  //     `/satis/toplu-uretim` canlıdır, bu yüzden kutucuk gerçek bir gezinme
  //     bayrağıdır ve "henüz açılmadı" gerekçesi kaldırıldı.
  await expect(page.getByTestId("blok-form-toplu-uretim")).toBeEnabled();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("blok-ekle-formu.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) UE · Ünite Ekle — dört kart + üç "bekleyen yüzey"
// ---------------------------------------------------------------------------
test("unite ekle formu gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/unite-ekle?proje=p-1");
  await expect(page.getByRole("heading", { name: "Ünite Ekle / Düzenle", level: 1 })).toBeVisible();

  // (a) UE 65 blok seçicisi GERÇEKTEN doldu — bu, T6'da mock backend'e eklenen
  //     `GET /projects/{id}/blocks` ucunun kanıtıdır; uç yokken seçici sessizce
  //     BOŞ kalıyordu ve jsdom bunu GÖRMÜYORDU.
  await expect(page.getByTestId("unite-form-blok")).toBeEnabled();
  // 🔴 SAHTE BEKÇİ TUZAĞI: `option` sayısının 0'dan büyük olduğunu iddia etmek
  // HİÇBİR ŞEY kanıtlamaz — "Seçiniz..." yer tutucusu tek başına o iddiayı
  // geçirir ve uç HİÇ veri dönmese bile test yeşil kalır. Bekçi, fikstürdeki
  // GERÇEK blok adını arar.
  await expect(page.getByTestId("unite-form-blok").locator("option")).toContainText(["A Blok"]);
  // (b) UE 89 m² birim fiyat SALT-OKUNUR türev alandır (elle girilmez). Mockup
  //     onu `readonly` çizer, `disabled` DEĞİL — ikisi AYRI şeydir ve fark
  //     bilerek korunur: bu alan CANLI bir türevdir (liste fiyatı/brüt m²
  //     değiştikçe güncellenir), aşağıdaki Maliyet ise BEKLEYEN bir yüzeydir
  //     ve `disabled` ile de kapatılır.
  await expect(page.getByTestId("unite-form-m2-fiyat")).toHaveJSProperty("readOnly", true);
  // (c) UE 91 Maliyet — backend KARAR 3 kolonu AÇMAZ; alan silinmedi, devre
  //     dışı + GÖRÜNÜR gerekçeyle basıldı,
  await expect(page.getByTestId("unite-form-maliyet")).toBeDisabled();
  await expect(page.getByTestId("unite-form-maliyet-gerekce")).toBeVisible();
  // (d) UE 97-99 Beklenen Kâr maliyete bağlı olduğu için hesaplanamaz —
  //     uydurma sayı yerine gerekçe basılır.
  await expect(page.getByTestId("unite-form-kar-gerekce")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("unite-ekle-formu.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) UE 65-66 · blok seçili — `Kat` listesi bloktan TÜRETİLİR
// ---------------------------------------------------------------------------
// Mockup UE 65-66 formu DOLU çizer ("B Blok" + "3. Kat"); ilk iki kadraj ise
// (repo emsali `daire-satisi-formu.png` gibi) VARSAYILAN hâli basar. Bu üçüncü
// kadraj aradaki farkı kapatır ve dilimin ASIL mekanizmasını görünür kılar:
// `Kat` seçenekleri sabit bir liste DEĞİL, seçili bloğun
// `basement_floor_count`/`floor_count`/`roof_type` üçlüsünden türetilir.
// `blk-1` fikstürü 2 bodrum + 8 kat + `duplex` çatı taşır ⇒ 12 seçenek.
//
// 🔴 `selectOption` KULLANILIR, `click` DEĞİL (F-PT dersi: tıklama + `fullPage`
// kadraj = bozuk kare); `prepareFrame` ayrıca imleci park eder.
test("unite ekle kat turetimi gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/unite-ekle?proje=p-1");
  await expect(page.getByTestId("unite-form-blok")).toBeEnabled();

  await page.getByTestId("unite-form-blok").selectOption({ label: "A Blok" });

  // Blok seçilince `Kat` AÇILIR (önce devre dışıydı) ve liste TÜREDİ:
  const floor = page.getByTestId("unite-form-kat");
  await expect(floor).toBeEnabled();
  // Zemin HER ZAMAN vardır; 8. Kat `floor_count`tan; Çatı Katı yalnız
  // `roof_type` duplex/terrace iken; 2. Bodrum `basement_floor_count`tan.
  await expect(floor.locator("option")).toContainText([
    "2. Bodrum",
    "Zemin",
    "8. Kat",
    "Çatı Katı",
  ]);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("unite-ekle-kat-turetimi.png", { fullPage: true });
});
