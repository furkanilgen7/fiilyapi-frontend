import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-P6 T4 · Bölüm Detay ekranı görsel testi (mockup Bölüm Detay.dc.html).
// sec-1 (A-Blok Şantiyesi altında, TÜM P6 alanları dolu) kullanılıyor — READ-ONLY
// (yalnız GET), hiçbir spec bu kaydı mutasyona uğratmıyor (section-form.spec.ts
// TÜM oluşturma/düzenleme akışlarını s-2 "B-Blok Şantiyesi" altında ayrı
// kayıtlarla yürütür, bkz. o dosyanın başlık yorumu) — P7'deki `pp-6` yarışı
// burada tekrarlanmıyor.
//
// Düzeltme turu 1 (kalite review bulgusu — Important): "Kalan Gün" hücresi
// `remainingDays.ts` ile `new Date()`e göre İSTEMCİ TARAFINDA hesaplanır
// (sec-1 `end_date`: "2026-09-30") — uygulama kodunda test-enjekte edilebilir
// bir "bugün" parametresi YOK (T2'de böyle kuruldu, bu task'ın kapsamı dışı:
// uygulama kodu DEĞİŞTİRİLMEDİ). Sabitlenmemiş bırakılırsa baseline üretildiği
// güne göre donar ve her gün "Kalan Gün" metni bir azalarak baseline'ı kırardı.
// Çözüm TEST TARAFINDA: Playwright'ın saat sabitleme API'si (`page.clock.
// setFixedTime`) NAVİGASYONDAN ÖNCE kurulur — böylece bileşenin `new Date()`
// çağrısı (her render'da yeniden hesaplanıyor, memoize edilmiyor) sabit bir
// zaman görür, sonuç deterministik olur. `mask:` YERİNE bu seçildi çünkü KPI
// hücresi anlamlı bir SAYI basmalı (mockup D91-93 "Kalan Gün" gerçek bir
// değerdir, maskelenmiş gri kutu mockup sadakatini bozardı). Sabit "bugün"
// (2026-09-01, öğlen UTC — TZ kaymasından kaçınmak için) sec-1'in
// `start_date` (2026-01-01) ile `end_date` (2026-09-30) ARASINDA: bölüm hâlâ
// "Aktif" durumuyla tutarlı, Kalan Gün pozitif ve sabit (29) basar.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
/**
 * 🔴 F-BLMPUAN — SABİT "BUGÜN" 2026-09-01'DEN 2026-08-20'YE ALINDI.
 *
 * Ekran artık İÇİNDE BULUNULAN ayın puantajını basıyor (`currentPeriod()`).
 * `mock-backend.ts` fikstür izolasyonuna göre **2026-09 · s-1, `PUT
 * .../timesheet` oyun alanıdır** ve paralel koşan puantaj spec'leri onu
 * mutasyona uğratır; kadraj o aya bakarsa BAŞKA BİR SPEC'İN YAZMASINA
 * bağımlı, dolayısıyla DETERMİNİSTİK OLMAYAN bir kare üretirdi.
 * **2026-08 · s-1 ise hiçbir spec tarafından değiştirilmez** (zengin, sabit
 * görsel fikstür) — kadraj oraya çekildi.
 *
 * Sonucu: "Kalan Gün" 29 → **41** (2026-08-20 → sec-1 `end_date` 2026-09-30).
 * Bölüm hâlâ `start_date`(2026-01-01)–`end_date` aralığında, "Aktif" tutarlı.
 */
const FIXED_TODAY = new Date("2026-08-20T12:00:00Z");

test("bolum detay ekrani gorsel", async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-1");
  await expect(page.getByRole("heading", { level: 1, name: "Kat 6–10 Kaba İnşaat" })).toBeVisible();
  // Bölüm Bedeli (gerçek veri) yüklendi — yükleme/iskelet durumunu dondurmamak için.
  await expect(page.getByTestId("section-hero-kpi-budget")).toContainText("₺");
  // 🔴 BOQ-SEC-F: varsayılan sekme artık YER TUTUCU DEĞİL, gerçek tablo basıyor.
  // "Yüklendi" iddiası HER BAĞIMSIZ VERİ KAYNAĞINI kapsar (görsel spec 5. parça):
  // bölüm detayı (`useSection`) yukarıdaki başlık/KPI iddialarıyla, süzgeçli BOQ
  // (`useBoq(siteId, sectionId)`) ise aşağıdaki satır iddiasıyla doğrulanır —
  // aksi hâlde kadraj "Yükleniyor…" hâlini dondurabilirdi.
  await expect(page.getByText("İş Kalemleri — Kat 6–10 Kaba İnşaat")).toBeVisible();
  await expect(page.getByTestId("section-boq-row")).toHaveCount(3);
  await expect(page.getByTestId("section-boq-total-amount")).toContainText("3.904.500");
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);
  // Alt satır kartları (Bu Bölümdeki İşçiler / Bölüm Malzeme Durumu) kadrajda.
  await expect(page.getByText("Bölüm Malzeme Durumu")).toBeVisible();
  // 🔴 F-BLMPUAN — ÜÇÜNCÜ BAĞIMSIZ VERİ KAYNAĞI (görsel spec 5. parça): işçi
  // kartı artık puantaj matrisinden besleniyor. İddia edilmezse kadraj o kartın
  // "Yükleniyor…" hâlini dondurabilir.
  await expect(page.getByTestId("section-workers-row")).toHaveCount(3);
  // Saat sabitlemesi işledi: Kalan Gün deterministik (2026-08-20 → 2026-09-30 = 41 gün).
  await expect(page.getByTestId("section-hero-kpi-days")).toContainText("41");

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay.png", { fullPage: true });
});


/**
 * F-BLMPUAN — "İşçiler & Puantaj" sekmesinin DOLU hâli.
 *
 * Mockup bu panel için çizim taşımaz (D100 aktif sekme "İş Kalemleri"dir);
 * yüzey ŞP mockup'ından türetilen `TimesheetTable`/`TimesheetSummaryStrip` ile
 * kurulur, bu yüzden kadraj ŞP karesinin bölüm-kapsamlı kardeşidir.
 */
test("bolum detay puantaj sekmesi gorsel", async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-1");
  await expect(page.getByRole("heading", { level: 1, name: "Kat 6–10 Kaba İnşaat" })).toBeVisible();
  await page.getByRole("tab", { name: "İşçiler & Puantaj" }).click();

  // Yerleşim oturdu (görsel spec 1. parça) — HER bağımsız kaynak ayrı ayrı:
  // matris (özet şeridi + satırlar) ve alt kart.
  await expect(page.locator(".ts-summary__title")).toHaveText("Kat 6–10 Kaba İnşaat · Ağustos 2026");
  await expect(page.locator(".ts-summary__count")).toHaveText("3 işçi");
  await expect(page.getByTestId("section-workers-row")).toHaveCount(3);
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay-puantaj.png", { fullPage: true });
});

/**
 * F-BLMPUAN — BOŞ hâlin AYRI karesi. "Veri yok" ile "modül yok" iki farklı
 * ekrandır; boş kare olmadan ikisinin ayrıştığı görsel olarak kanıtlanmaz.
 */
test("bolum detay puantaj sekmesi BOS hali gorsel", async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  // sec-3 hiç puantaj hücresi taşımaz.
  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-3");
  await expect(page.getByRole("heading", { level: 1, name: "Peyzaj Düzenlemesi (Taslak)" })).toBeVisible();
  await page.getByRole("tab", { name: "İşçiler & Puantaj" }).click();
  await expect(page.locator(".ts-summary__count")).toHaveText("0 işçi");
  await expect(page.getByTestId("section-workers-empty")).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay-puantaj-bos.png", { fullPage: true });
});

/**
 * ============================================================================
 * F-BLMSEK T4 — T1/T2/T3'te CANLIYA ALINAN ÜÇ SEKMENİN KARELERİ.
 * ============================================================================
 *
 * Ortak kurallar (yukarıdaki üç testle AYNI): saat NAVİGASYONDAN ÖNCE
 * sabitlenir, 1440×900, `prepareFrame(page)` kareden hemen önce.
 *
 * 🔴 "YÜKLENDİ" İDDİASI HER BAĞIMSIZ KAYNAĞI KAPSAR (görsel spec 5. parça).
 * Bu ekranda kadraja giren DÖRT kaynak vardır ve sekme değişse de alt satır
 * kartları HEP ekrandadır:
 *   1. bölüm detayı (`useSection`)        → başlık + Bölüm Bedeli KPI'ı,
 *   2. puantaj (`useTimesheetData`)       → alt kartın işçi satırları,
 *   3. sekmenin KENDİ kaynağı             → günlük satırı / hakediş satırı,
 *   4. (Malzeme'de 3. kaynak YOKTUR — panel tamamen statiktir.)
 * Biri iddia edilmezse kadraj o kartın "Yükleniyor…" hâlini DONDURUR.
 */

/** Alt satır kartları + hero HER karede aynı şekilde çözülür. */
async function openSectionFrame(
  page: import("@playwright/test").Page,
  sectionId: string,
  heading: string,
) {
  await page.clock.setFixedTime(FIXED_TODAY);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto(`/projeler/p-1/santiyeler/s-1/bolumler/${sectionId}`);
  // KAYNAK 1 — bölüm detayı.
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.getByText("Bölüm Malzeme Durumu")).toBeVisible();
}

/**
 * 🔴 GÜNLÜK KAYIT NOTU MASKELENİR — ve bu bir SÜS DEĞİL, DOĞRULUK KOŞULUDUR.
 *
 * ÖLÇÜLDÜ: `SectionDiaryPanel` AY SÜZGECİ UYGULAMAZ (`useSiteDiaryEntries(siteId)`
 * tüm filtreleri `null` geçer — önbelleği şantiye günlüğü ekranıyla PAYLAŞMAK
 * için, bkz. `SectionDetailView.tsx`). `e2e/site-diary.spec.ts` ise mutasyon
 * akışını bilerek **2026-09 · s-1**'de yürütür ve orada BÖLÜMSÜZ
 * (`section_id: null`) bir kayıt AÇAR. O kayıt listeye GİRMEZ (null bu sekmede
 * gösterilmez) ama `unassignedCount`u 0→1 yapar, yani notun METNİ ve YÜKSEKLİĞİ
 * o spec'in `fullyParallel` altında ne zaman koştuğuna göre DEĞİŞİR.
 *
 * Diğer spec'lerin ay-tabanlı izolasyonu bu ekranı KORUMAZ, çünkü koruma
 * "görsel spec'ler Temmuz'a bakar" varsayımına dayanıyordu — bu panel HİÇBİR
 * aya bakmaz. Satırların KENDİSİ deterministiktir (sec-1 → yalnız `d-1`),
 * bu yüzden kare korunur ve YALNIZ not maskelenir. Notun İÇERİĞİ zaten
 * `section-detail-tabs.spec.ts`te davranışsal olarak bekçilenir.
 */
const DIARY_NOTE_MASK = (page: import("@playwright/test").Page) => [
  page.getByTestId("section-diary-note"),
];

test("bolum detay gunluk kayit sekmesi gorsel", async ({ page }) => {
  await openSectionFrame(page, "sec-1", "Kat 6–10 Kaba İnşaat");
  await page.getByRole("tab", { name: "Günlük Kayıt" }).click();

  // KAYNAK 3 — günlük listesi. sec-1'in TEK kaydı `d-1` (`d-2` T4'te sec-2'ye
  // taşındı; karşı-kanıt gerekçesi `mock-backend.ts`te).
  const panel = page.getByTestId("section-diary");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Kat 6–10 Kaba İnşaat · Günlük Kayıtlar",
  );
  await expect(panel.locator(".section-diary__row")).toHaveCount(1);
  // KAYNAK 2 — alt kartın puantaj satırları.
  await expect(page.getByTestId("section-workers-row")).toHaveCount(3);
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay-gunluk-kayit.png", {
    fullPage: true,
    mask: DIARY_NOTE_MASK(page),
  });
});

/**
 * BOŞ hâlin AYRI karesi — "veri yok" ile "modül yok" iki farklı ekrandır
 * (F-BLMPUAN kanonu). Boş kare olmadan ikisinin ayrıştığı GÖRSEL olarak
 * kanıtlanmaz; kullanıcının şikâyeti tam da bu ayrımın yokluğuydu.
 */
test("bolum detay gunluk kayit sekmesi BOS hali gorsel", async ({ page }) => {
  await openSectionFrame(page, "sec-3", "Peyzaj Düzenlemesi (Taslak)");
  await page.getByRole("tab", { name: "Günlük Kayıt" }).click();

  const panel = page.getByTestId("section-diary");
  await expect(panel).toContainText("Bu bölümde günlük kayıt yok");
  await expect(panel.locator(".section-diary__row")).toHaveCount(0);
  // sec-3 hiç puantaj hücresi taşımaz — alt kart BOŞ durumuyla çözülür.
  await expect(page.getByTestId("section-workers-empty")).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay-gunluk-kayit-bos.png", {
    fullPage: true,
    mask: DIARY_NOTE_MASK(page),
  });
});

/**
 * HAKEDİŞ sekmesi — DOLU hâl.
 *
 * 🔴 DETERMİNİZM ÖLÇÜLDÜ (maskeye GEREK YOK): `subcontractor-progress-payments.
 * spec.ts` mutasyona uğrattığı İKİ kaydı (`scpp-6`, `scpp-7`) `hiddenFromLists:
 * true` ile liste uçlarından YAPISAL olarak dışlar ve sözleşme seçim adımı
 * testi create formuna GİRER ama KAYDETMEZ (yeni hakediş doğmaz). Görünen küme
 * bu yüzden sabittir: `scpp-2` (sec-1) + `scpp-1`/`scpp-4` ("Tüm Bölümler").
 */
test("bolum detay hakedis sekmesi gorsel", async ({ page }) => {
  await openSectionFrame(page, "sec-1", "Kat 6–10 Kaba İnşaat");
  await page.getByRole("tab", { name: "Hakediş" }).click();

  // KAYNAK 3 — taşeron hakediş listesi.
  const panel = page.getByTestId("section-payments");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Kat 6–10 Kaba İnşaat · Taşeron Hakedişleri",
  );
  await expect(panel.locator(".pp-row")).toHaveCount(3);
  // Kadrajın ASIL bekçilediği ayrım: bölüm adı basan satır ile "Tüm Bölümler"
  // basan satır AYNI karede yan yana görünür.
  await expect(panel).toContainText("Elektrik · Kat 6–10 Kaba İnşaat");
  await expect(panel.getByText("Elektrik · Tüm Bölümler")).toHaveCount(2);
  // Kapsam satırı (İŞVEREN hakedişi kırılmıyor) kadrajda ve GÖRÜNÜR.
  await expect(panel.getByTestId("section-payments-scope")).toBeVisible();
  // KAYNAK 2.
  await expect(page.getByTestId("section-workers-row")).toHaveCount(3);
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay-hakedis.png", { fullPage: true });
});

/**
 * MALZEME sekmesi — T3'te yeniden yazılan YER TUTUCU.
 *
 * Kullanıcının şikâyetinin merkezindeki ekran budur: eskiden jenerik
 * `${label} — bu bölümde henüz görüntülenemiyor` basıyordu, artık kendi
 * başlığını + ALANI adlandıran gerekçesini + çıkış bağlantısını basıyor.
 * Kare, "pending kalan tek sekme"nin de DÜRÜST ve AYIRT EDİLEBİLİR olduğunu
 * kilitler. Bu panelin kendi veri kaynağı YOKTUR (tamamen statik).
 */
test("bolum detay malzeme sekmesi gorsel", async ({ page }) => {
  await openSectionFrame(page, "sec-1", "Kat 6–10 Kaba İnşaat");
  await page.getByRole("tab", { name: "Malzeme" }).click();

  const panel = page.getByTestId("section-stock");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Kat 6–10 Kaba İnşaat · Stok Hareketleri",
  );
  await expect(panel).toContainText("Stok hareketi bölüm alanı taşımıyor");
  // KAYNAK 2.
  await expect(page.getByTestId("section-workers-row")).toHaveCount(3);
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-detay-malzeme.png", { fullPage: true });
});

/**
 * ⛔ `bolum-detay-hakedis-bos.png` BİLEREK YAZILMADI — KADRAJI ALINAMAZ.
 *
 * Görev tanımı "hakedişi olmayan bir bölüm" istiyordu (canlıda kullanıcının
 * BUGÜN gördüğü hâl: sıfır taşeron hakedişi). İkizde böyle bir bölüm YOKTUR ve
 * fikstür EKLEMEDEN de üretilemez — ölçüldü:
 *   · Toplam ÜÇ bölüm vardır (`sec-1`/`sec-2`/`sec-3`) ve ÜÇÜ DE `s-1`
 *     altındadır; `s-2`nin hiç bölümü yoktur (`section-form.spec.ts` kendi
 *     kayıtlarını KOŞARKEN yaratır — deterministik değildir).
 *   · `partitionSectionPayments` `section_id === null` satırları HER bölümde
 *     GÖSTERİR ("Tüm Bölümler" = kapsam iddiası taşır, düşürmek bilgi kaybı
 *     olurdu — `section-payments.ts` doğum yorumu). `scpp-1` ve `scpp-4` `null`
 *     kaldığı için s-1'in HER bölümü en az İKİ satır basar.
 *   · `scpp-1`/`scpp-4`ü bölüme bağlamak boş hâli açardı ama
 *     `site-progress-payments-visual.spec.ts:68`in "Elektrik · Tüm Bölümler"
 *     iddiasını KIRARDI — o iddia korunacaktı (T4 görev tanımı).
 *
 * Boş dal BEKÇİSİZ DEĞİLDİR: `SectionPaymentsPanel.test.tsx` onu DÖRT ayrı
 * iddiayla ölçer (`section-payments-empty` — boş liste, yalnız-başka-bölüm,
 * kırpılma bandı dahil). Eksik olan yalnız PİKSEL kaydıdır; uydurma bir
 * fikstürle sahte bir kare üretmek yerine boşluk BURAYA YAZILDI.
 */
