import { test, expect, type Page } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-UNIT2 T3 · TU (`/satis/toplu-uretim`) · EI (`/satis/excel-ice-aktar`) ·
// PG (`/satis/paylasim-girisi`) görsel kadrajları. Kanonik mockup'lar:
// `projedesign/Form - Toplu Unite.dc.html` · `Form - Unite Excel Import.dc.html`
// · `Form - Paylasim Girisi.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer; içermeyen bir görsel test
// fonksiyonel turda baseline'sız koşar ve KIRMIZI olur.
//
// 🔴🔴 BU DOSYANIN VAR OLMA SEBEBİ — F-HZ2 KAZASI. Kardeş bir dilim, fikstür
// satırı `mock-backend.ts`e EKLENMEMİŞ bir ekranı sevk etti: BEŞ KAPI DA YEŞİL
// geçti çünkü eksik fikstür HATA VERMEZ, sadece BOŞ DURUM çizer ve boş durum
// meşru bir kare gibi görünür. Bu yüzden buradaki HER kadrajdan önce, YALNIZ
// ucun gerçekten cevapladığı hâlde ekranda bulunabilecek GERÇEK FİKSTÜR
// DEĞERLERİ ölçülür (belirli bir ünite numarası · belirli bir sayaç · belirli
// bir sözleşme numarası).
//
// 🔴 SAHTE BEKÇİ TUZAĞI (F-UNIT1'in kendi uyarısı): "öğe var" ya da "seçenek
// sayısı > 0" İDDİA ETMEK HİÇBİR ŞEY KANITLAMAZ — "Seçiniz..." yer tutucusu o
// iddiayı tek başına geçirir. Bekçi fikstürdeki ADI/SAYIYI arar.
//
// 🔒 YAZMA YOK: bu dosyadaki hiçbir test paylaşılan mock durumunu
// DEĞİŞTİRMEZ. TU'nun `…/units/bulk/preview` ve EI'nin `…/units/import/validate`
// uçları sunucuda TEK SATIR bile yazmaz (ikisi de OKUMA ucudur, denetim satırı
// bile üretmezler), PG kadrajları da yalnız GET okur. Yazma akışları
// `unit-bulk-import-allocation.spec.ts`tedir ve `p-2`de yürür.
//
// 🔒 PROJE ROLLERİ (bkz. `mock-backend.ts` F-UNIT2 fikstür başlığı):
//   `p-1` → TU/EI kadrajlarının salt-okur kaynağı (blk-1: 2 bodrum + 8 kat +
//           duplex çatı + 3 daire/kat, mevcut üniteler "1"…"6")
//   `p-3` → PG baseline adası (42 ünite, mockup'ın denge hükmünü birebir üretir)
//   `p-4` → PG "hesaplanamaz denge" adası (rayiç girilmemiş)
//
// ⏱️ SAAT SABİTLEME GEREKMEZ (ölçüldü): `bulk-unit-form/`, `unit-import/` ve
// `land-share-allocation/` altında `new Date()` / `isoDate` / bugüne bağlı
// varsayılan HİÇ YOKTUR; üç formun da tarih alanı yoktur. Kıyas:
// `stock-entry-visual.spec.ts`te "Giriş Tarihi" bugünle dolduğu için
// `page.clock` ZORUNLUYDU.
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

/**
 * TU 96-135 kat şablonunun mockup'taki ÜÇ satırı (TU 108-134): oda tipi, brüt,
 * net, cephe ve liste fiyatı. Sayılar mockup'tan BİREBİRDİR.
 *
 * 🔴 `selectOption`/`fill` KULLANILIR, `click` DEĞİL (F-PT dersi: tıklama +
 * `fullPage` kadraj = bozuk kare). Seçiciler ayrıca `touched` kapısını açar:
 * `layout`/`facing` NULLABLE olduğu için dokunulmadıkça gövdeye HİÇ girmez ve
 * önizleme o sütunları "—" basardı.
 */
async function fillSlotTemplate(page: Page) {
  const slots = [
    { sequence: 1, layout: "3+1", gross: "148", net: "128", facing: "Güney", price: "1280000" },
    { sequence: 2, layout: "2+1", gross: "112", net: "96", facing: "Doğu", price: "940000" },
    { sequence: 3, layout: "3+1", gross: "148", net: "128", facing: "Batı", price: "1240000" },
  ];
  for (const slot of slots) {
    await page.getByTestId(`toplu-form-oda-tipi-${slot.sequence}`).selectOption({ label: slot.layout });
    await page.getByTestId(`toplu-form-brut-${slot.sequence}`).fill(slot.gross);
    await page.getByTestId(`toplu-form-net-${slot.sequence}`).fill(slot.net);
    await page.getByTestId(`toplu-form-cephe-${slot.sequence}`).selectOption({ label: slot.facing });
    await page.getByTestId(`toplu-form-liste-fiyat-${slot.sequence}`).fill(slot.price);
  }
}

/** TU 70-72 — kat aralığı + kat başına daire (mockup: 1. Kat → 8. Kat, 3 daire). */
async function fillBulkRules(page: Page) {
  await page.getByTestId("toplu-form-baslangic-kat").selectOption({ label: "1. Kat" });
  await page.getByTestId("toplu-form-bitis-kat").selectOption({ label: "8. Kat" });
  await page.getByTestId("toplu-form-kat-basina").fill("3");
}

// ---------------------------------------------------------------------------
// 1) TU · kurallar girilmiş, önizleme HENÜZ ALINMAMIŞ
// ---------------------------------------------------------------------------
// TU 73'ün "Toplam Üretilecek"i ekranın TEK istemci türevidir ve sunucu
// formülüyle birebirdir (`derive.ts`); bu kadraj onu önizlemeden BAĞIMSIZ
// olarak basar. Önizleme kartı bilerek boştur ve "hiçbir şey yazmaz" gerekçesi
// görünür durur (TU 145-147'nin karşılığı).
test("toplu uretim formu gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/toplu-uretim?proje=p-1&blok=blk-1");
  await expect(page.getByRole("heading", { name: "Toplu Ünite Üretimi", level: 1 })).toBeVisible();

  // YERLEŞİM OTURDU + FİKSTÜR KANITI (WORKFLOW §4, 5. parça):
  // (a) proje listesi geldi ve `?proje=` tohumu oturdu,
  await expect(page.getByTestId("toplu-form-proje")).toHaveValue("p-1");
  // (b) 🔴 BLOK LİSTESİ GERÇEKTEN DOLDU — bu, mock backend'e eklenen
  //     `GET /projects/{id}/blocks` fikstürünün kanıtıdır. Fikstür yokken
  //     seçici sessizce BOŞ kalır ve kadraj yine "meşru" görünürdü.
  await expect(page.getByTestId("toplu-form-blok").locator("option")).toContainText(["A Blok"]);
  // (c) `?blok=` tohumu da oturdu (BE 109 zincirinin varış noktası),
  await expect(page.getByTestId("toplu-form-blok")).toHaveValue("blk-1");
  // (d) 🔴 KAT LİSTESİ BLOKTAN TÜREDİ: "2. Bodrum" `basement_floor_count`tan,
  //     "8. Kat" `floor_count`tan, "Çatı Katı" YALNIZ `roof_type` duplex/terrace
  //     iken gelir. Üçü birden görünüyorsa `blk-1`in YAPISAL alanları teldedir.
  await expect(page.getByTestId("toplu-form-baslangic-kat").locator("option")).toContainText([
    "2. Bodrum",
    "Zemin",
    "8. Kat",
  ]);
  await expect(page.getByTestId("toplu-form-bitis-kat").locator("option")).toContainText([
    "Çatı Katı",
  ]);

  await fillBulkRules(page);

  // (e) TU 73 türevi: 8 − 1 + 1 = 8 tur × 3 daire = 24 (mockup TU 73 ile aynı sayı),
  await expect(page.getByTestId("toplu-form-toplam")).toHaveValue("24 ünite");
  // (f) TU 96-135 tablosu daire sayısıyla KİLİTLİ hareket etti — 3 satır,
  await expect(page.getByTestId("toplu-form-sablon-satir")).toHaveCount(3);
  // (g) TU 104 "Maliyet" sütunu SİLİNMEDİ, devre dışı + görünür gerekçeyle basıldı,
  await expect(page.getByTestId("toplu-form-maliyet-1")).toBeDisabled();
  await expect(page.getByTestId("toplu-form-maliyet-gerekce")).toBeVisible();
  // (h) önizleme kartı BOŞ ve gerekçesi görünür ("bu adım hiçbir şey yazmaz").
  await expect(page.getByTestId("toplu-form-onizleme-bos")).toContainText("Önizlemeyi Yenile");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("toplu-uretim-formu.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) TU · önizleme alınmış — 24 satır + ÇAKIŞAN satırlar
// ---------------------------------------------------------------------------
// Dilimin ASIL mekanizması burada görünür: numaralandırma deseni, kat turu,
// kat başına slot ve ÇAKIŞMA işaretlemesi. `blk-1`de "1"…"6" numaralı üniteler
// ZATEN VARDIR; `{Sıra}` deseni (şema varsayılanı `sequential`) 1'den başlayınca
// ilk altı satır çakışır. Çakışma HATA DEĞİLDİR — uç 200 döner ve satırlar
// `conflict: true` ile gelir (TU 177); blokaj yalnız kaydetmededir (409).
test("toplu uretim onizleme cakismasi gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/toplu-uretim?proje=p-1&blok=blk-1");
  await expect(page.getByTestId("toplu-form-blok")).toHaveValue("blk-1");

  await fillBulkRules(page);
  // TU 79'un BEŞİNCİ deseni (mockup'ta yok, şema varsayılanı): düz `{Sıra}`.
  await page.getByTestId("toplu-form-numaralandirma").selectOption("sequential");
  await page.getByTestId("toplu-form-baslangic-no").fill("1");
  await fillSlotTemplate(page);

  // Önizleme yalnız düğmeyle tetiklenir (TU 182 açıkça elle bir eylemdir);
  // `selectOption` ile tetiklenebilir bir yol YOKTUR. `prepareFrame` tıklamanın
  // bıraktığı kaydırmayı ve `:hover`ı aşağıda temizler.
  await page.getByTestId("toplu-form-onizle").click();

  // 🔴 FİKSTÜR KANITI — ÜÇ AYRI SAYI, ÜÇÜ DE SUNUCUDAN:
  // (a) TU 146 özet şeridi: satır sayısı VE toplam liste değeri. Toplam
  //     8 kat × (1.280.000 + 940.000 + 1.240.000) = 27.680.000 ₺'dir; mockup'ın
  //     "₺27.264.000"ı KANON DEĞİLDİR (`bulk.py::total_list_value` bunu kayda
  //     geçirmiştir) ve ekran ONU HİÇ HESAPLAMAZ, sunucununkini basar.
  await expect(page.getByTestId("toplu-form-onizleme-ozet")).toContainText(
    "24 ünite oluşturulacak",
  );
  await expect(page.getByTestId("toplu-form-onizleme-ozet")).toContainText("₺27.680.000");
  // (b) çakışan numaralar ÜRETİM SIRASINDA listelenir (küme sırası değil),
  await expect(page.getByTestId("toplu-form-onizleme-cakisma")).toContainText(
    "6 ünite numarası çakışıyor (1, 2, 3, 4, 5, 6).",
  );
  // (c) tablo TAM listeyi basar — mockup'ın "… 17 ünite daha" kısaltması
  //     statik çizimin işidir, gerçek uç `rows`u eksiksiz gönderir,
  await expect(page.getByTestId("toplu-form-onizleme-satir")).toHaveCount(24);
  // (d) kat ETİKETİ (`floor_label`) basılır, sayısal `floor` DEĞİL (karar 4),
  await expect(page.getByTestId("toplu-form-onizleme-satir").first()).toContainText("1. Kat");
  // (e) çakışan satır GÖRÜNÜR bir rozet taşır (renk körü kullanıcıya zemin
  //     rengi hiçbir şey söylemezdi),
  await expect(page.getByTestId("toplu-form-onizleme-satir").first()).toContainText("Çakışma");
  // (f) çakışmayan satır (7. sıra) rozetsizdir — "hepsi çakıştı" hâli değil,
  await expect(page.getByTestId("toplu-form-onizleme-satir").nth(6)).not.toContainText("Çakışma");
  // (g) alt eylem etiketi de türevdir.
  await expect(page.getByTestId("toplu-form-olustur")).toHaveText("24 Üniteyi Oluştur");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("toplu-uretim-onizleme.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) EI · dosya seçilmemiş varsayılan hâl
// ---------------------------------------------------------------------------
// 🔴 ONAYLI SAPMA GÖRÜNÜR: mockup EI 76 `accept=".xlsx,.xls,.csv"` ve EI 79
// "Maks 10 MB" yazar; sunucu YALNIZ `.xlsx` kabul eder ve sınır 2 MB'dır
// (`importer.py`, spec §7.8). Ekran GERÇEĞİ basar — mockup metni birebir
// basılsaydı kullanıcı `.csv` seçip reddedilirdi (sessiz tuzak).
test("excel ice aktarma formu gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/excel-ice-aktar?proje=p-1");
  await expect(page.getByRole("heading", { name: "Excel'den Ünite İçe Aktarma", level: 1 })).toBeVisible();

  // FİKSTÜR KANITI:
  // (a) proje tohumu oturdu,
  await expect(page.getByTestId("excel-form-proje")).toHaveValue("p-1");
  // (b) 🔴 ŞANTİYE SEÇİCİSİ GERÇEK ADLA DOLDU. EI 61 TU'nun aksine GERÇEK bir
  //     gövde alanıdır (`site_id`, "yalnız yeni blok açarken kullanılır"), bu
  //     yüzden listenin dolduğunu ölçmek gövdeyi ölçmektir. Yer tutucu tek
  //     başına geçmesin diye fikstürdeki AD aranır.
  await expect(page.getByTestId("excel-form-santiye").locator("option")).toContainText([
    "A-Blok Şantiyesi",
    "B-Blok Şantiyesi",
  ]);
  // (c) dosya yokken yeşil "yüklendi" kutusu ÇİZİLMEZ,
  await expect(page.getByTestId("excel-form-dosya-bos")).toBeVisible();
  // (d) doğrulama kartı boş + gerekçeli, satır tablosu HİÇ basılmamış.
  await expect(page.getByTestId("excel-form-dogrulama-bos")).toBeVisible();
  await expect(page.getByTestId("excel-form-satirlar-kart")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("excel-ice-aktarma-formu.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 4) EI · doğrulama sonucu — dört sayaç + üç durumlu tablo + ÇOK MESAJLI satır
// ---------------------------------------------------------------------------
// Dosya bellekten verilir: sunucu dosyayı SAKLAMAZ ("Yeniden Doğrula → Aktar"
// akışında aynı `File` iki kez yüklenir) ve mock `.xlsx` ayrıştırmaz — sınanan
// sözleşme dosyanın içeriği değil, raporun EKRANDAKİ yüzeyidir.
test("excel ice aktarma dogrulama gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/excel-ice-aktar?proje=p-1");
  await expect(page.getByTestId("excel-form-proje")).toHaveValue("p-1");

  // Dosya seçimi doğrulamayı KENDİLİĞİNDEN tetikler (`handleSelectFile`).
  await page.getByTestId("excel-form-dosya").setInputFiles({
    name: "uniteler.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("PK-fiil-unite-listesi", "utf8"),
  });

  // 🔴 FİKSTÜR KANITI — DÖRT SAYAÇ (EI 94-99). Değişmez:
  // `valid + warning + error === total_rows` (22 + 1 + 1 = 24). Sayaçlar
  // gelmemiş olsaydı kart "Dosya doğrulanıyor…" gerekçesinde kalırdı.
  await expect(page.getByTestId("excel-form-sayac-toplam")).toContainText("24");
  await expect(page.getByTestId("excel-form-sayac-gecerli")).toContainText("22");
  await expect(page.getByTestId("excel-form-sayac-uyari")).toContainText("1");
  await expect(page.getByTestId("excel-form-sayac-hata")).toContainText("1");
  // Satır raporu TAM gelir (mockup'ın "… 19 satır daha"sı statik çizimdir).
  await expect(page.getByTestId("excel-form-satir")).toHaveCount(24);

  // 🔴 EI 161 — TEK SATIRDA İKİ MESAJ. `messages` bir LİSTEDİR ve tek metne
  // BİRLEŞTİRİLMEZ; bu kadrajın taşıdığı asıl mekanizma budur.
  const errorRow = page.getByTestId("excel-form-satir").filter({ hasText: "C-6" });
  await expect(errorRow.getByTestId("excel-form-satir-mesaj")).toHaveCount(2);
  await expect(errorRow.getByTestId("excel-form-satir-mesaj")).toContainText([
    "Oda Tipi boş",
    "Brüt m² sıfır olamaz",
  ]);
  // Uyarılı satır TEK mesaj taşır (üç durum da temsil edilir).
  await expect(
    page.getByTestId("excel-form-satir").filter({ hasText: "C-10" }).getByTestId("excel-form-satir-mesaj"),
  ).toHaveCount(1);

  // 🔴 MOCKUP'TA KUTUSU YOK, EKRANDA VAR: aktarım dosyada geçen ama projede
  // olmayan bloğu AÇAR ve bunu söylemek sessiz sürprizi keser.
  await expect(page.getByTestId("excel-form-yeni-bloklar")).toContainText("C Blok");
  // EI 202'nin sayısı TÜREVDİR: kutucuk işaretliyken 22 geçerli + 1 uyarılı = 23.
  await expect(page.getByTestId("excel-form-aktar")).toHaveText("23 Geçerli Satırı Aktar");
  // Aktarım henüz YAPILMADI — sonuç şeridi kadraja giremez.
  await expect(page.getByTestId("excel-form-sonuc")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("excel-ice-aktarma-dogrulama.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 5) PG · atanmayan satırlar + HESAPLANABİLİR denge (mockup'ın kendi hükmü)
// ---------------------------------------------------------------------------
// `p-3` fikstürü mockup'ın SAYILARINI değil HÜKMÜNÜ birebir üretir: 42 ünite,
// beklenen 23/19, atanan 20/16, atanmayan 6, gerçekleşen %55,6 / %44,4, sapma
// %0,6 → "Değer dengesi uygun" (PG 71 · 73-81 · 247-266).
//
// Süzgeç VARSAYILANDA "Atanmayan"dır ve mockup da o sekmeyi AKTİF çizer
// (PG 112) — kadraj bu yüzden hiçbir düğmeye basmadan mockup'ın hâlini basar.
test("paylasim girisi formu gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/paylasim-girisi?proje=p-3");
  await expect(page.getByRole("heading", { name: "Kat Karşılığı Paylaşım Girişi", level: 1 })).toBeVisible();

  // 🔴 FİKSTÜR KANITI — HEPSİ YALNIZ UÇ CEVAP VERDİĞİNDE EKRANDA OLABİLİR:
  // (a) PG 61 sözleşme kutusu SALT-OKURDUR ve numarası sunucudan gelir,
  await expect(page.getByTestId("paylasim-form-sozlesme-no")).toHaveText("KKS-2026-001");
  // (b) PG 62 blok süzgeci `GET /projects/{id}/blocks`ten doldu,
  await expect(page.getByTestId("paylasim-form-blok-suzgec").locator("option")).toContainText([
    "A Blok",
    "B Blok",
  ]);
  // (c) PG 247-253 adet dengesi — üç sayı da SUNUCUDAN (istemci
  //     `Math.round(total * pct)` yazsaydı 42 üniteyi 23+20=43 yapardı),
  await expect(page.getByTestId("paylasim-form-beklenen-adet")).toHaveText("23 ünite");
  await expect(page.getByTestId("paylasim-form-atanan-adet")).toHaveText("20 ünite");
  await expect(page.getByTestId("paylasim-form-eksik-adet")).toHaveText("3 ünite");
  // (d) PG 257-260 değer dengesi — iki tutar + gerçekleşen oran,
  await expect(page.getByTestId("paylasim-form-bizim-deger")).toHaveText("₺26,4M");
  await expect(page.getByTestId("paylasim-form-arsa-deger")).toHaveText("₺21,1M");
  await expect(page.getByTestId("paylasim-form-gerceklesen-oran")).toHaveText("%55,6 / %44,4");
  // (e) PG 264-266 hüküm ÜÇ HÂLLİDİR; burada hesaplanabilir ve eşik içinde,
  await expect(page.getByTestId("paylasim-form-denge-hukmu")).toHaveAttribute("data-verdict", "ok");
  await expect(page.getByTestId("paylasim-form-denge-hukmu")).toContainText("Sapma %0,6");
  // (f) PG 96-99 hissedar seçenekleri ÖZETİN `shareholders` alanından gelir —
  //     ayrı bir `/shareholders` kökü GEREKMEZ,
  await expect(page.getByTestId("paylasim-form-toplu-hissedar").locator("option")).toContainText([
    "Ahmet Yılmaz (%50)",
    "Fatma Yılmaz (%30)",
    "Ali Yılmaz (%20)",
  ]);
  // (g) PG 101 düğmesinin yüzdeleri SÖZLEŞMEDEN türer, sabit değildir,
  await expect(page.getByTestId("paylasim-form-otomatik-dagit")).toContainText("%55");
  // (h) 🔴 TABLO GERÇEK SATIR BASIYOR: mockup'ın atanmamış olarak çizdiği
  //     A-9 (kat 3, 3+1) ve A-10 (kat 4, 2+1) satırları teldedir. Satır sayısı
  //     süzgecin rozetiyle de tutarlıdır (6 atanmayan).
  await expect(page.getByTestId("paylasim-form-satir-A-9")).toBeVisible();
  await expect(page.getByTestId("paylasim-form-satir-A-10")).toBeVisible();
  await expect(page.getByTestId("paylasim-form-suzgec-unassigned")).toHaveText("Atanmayan (6)");
  await expect(page.getByTestId("paylasim-form-suzgec-all")).toHaveText("Tümü (42)");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("paylasim-girisi-formu.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 6) PG · HESAPLANAMAZ denge — derleyicinin GÖRMEDİĞİ hata sınıfının kadrajı
// ---------------------------------------------------------------------------
// `LandShareValueBalance`ın dört alanı (`our_actual_pct` · `owner_actual_pct` ·
// `deviation_pct` · `is_within_tolerance`) `null` OLABİLİR ve bu
// "HESAPLANAMAZ"dır, "sıfır" DEĞİL. Tip sistemi alanların VAR olduğunu zorlar,
// NE ANLAMA GELDİĞİNİ değil: `%0` basmak ya da `null`ı yanlış sayıp yeşil
// "denge uygun" yazmak DERLENİR ve testsiz geçer. `p-4` adası (rayiç değeri
// hiç girilmemiş, tamamlanmış proje) bu hâlin tek kanıtıdır.
//
// 🔒 Frame 5'in fikstürüne DOKUNMAZ: ayrı bir projedir, ayrı bir sözleşmedir ve
// hiçbir yazma testi `p-4`e uğramaz.
test("paylasim girisi hesaplanamaz denge gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/satis/paylasim-girisi?proje=p-4");
  await expect(page.getByTestId("paylasim-form-sozlesme-no")).toHaveText("KKS-2023-014");

  // FİKSTÜR KANITI: adet dengesi HESAPLANIR (sayılar rayiçten bağımsızdır)…
  await expect(page.getByTestId("paylasim-form-beklenen-adet")).toHaveText("4 ünite");
  await expect(page.getByTestId("paylasim-form-atanan-adet")).toHaveText("2 ünite");
  await expect(page.getByTestId("paylasim-form-suzgec-all")).toHaveText("Tümü (8)");
  await expect(page.getByTestId("paylasim-form-satir-G-5")).toBeVisible();

  // …DEĞER dengesi hesaplanamaz: iki tutar SIFIR, oran "—" ve hüküm NÖTRDÜR.
  await expect(page.getByTestId("paylasim-form-gerceklesen-oran")).toHaveText("—");
  await expect(page.getByTestId("paylasim-form-denge-hukmu")).toHaveAttribute(
    "data-verdict",
    "uncomputable",
  );
  await expect(page.getByTestId("paylasim-form-denge-hukmu")).toContainText(
    "Değer dengesi hesaplanamıyor",
  );
  // 🔴 YEŞİL ONAY BASILMADIĞININ AÇIK ÖLÇÜMÜ — hatanın kendisi tam olarak budur.
  await expect(page.getByTestId("paylasim-form-denge-hukmu")).not.toContainText(
    "Değer dengesi uygun",
  );

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("paylasim-girisi-hesaplanamaz.png", { fullPage: true });
});
