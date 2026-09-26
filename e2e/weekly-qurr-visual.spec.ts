import { test, expect } from "@playwright/test";

import { ACTIVE_SITE_ID, WEEKLY_QURR_VIEWPORT, login, openWeeklyQurr } from "./earned-value-helpers";
import { prepareFrame } from "./visual-scroll";

// PLN-F3.6b · `Planlama - Haftalık QURR` (QURR) görsel kadrajları.
// Kanonik mockup: `projedesign/Planlama - Haftalık QURR.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER (5. kapı `--grep-invert`
// ile BAŞLIĞA göre süzer).
//
// 🔒 SALT-OKUR: hiçbir kadraj YAZMAZ — Excel indir TIKLANMAZ (dosya indirir),
// PDF/Yazdır düğmesi de `window.print()` çağırdığı için TIKLANMAZ; yazdırma
// önizlemesi kadrajı SEGMENTLİ SEKME ("Yazdırma önizlemesi") ile açılır.
//
// 📅 SAAT ÇAKILIDIR (`login` içinde, NAVİGASYONDAN ÖNCE) — QURR'un kendisi
// "bugün"e bakmaz (hafta backend'den/`?hafta=`den gelir) ama ortak kanon
// (`visual-frame-guard`) sırayı ister.
//
// SENARYOLAR (`e2e/mock-backend.ts` `evReportsRoute`): `week=1` → 409 (baseline
// yok) · `week=999` → 404 (hafta takvimde yok, BU SPEC'TE KULLANILMADI) ·
// `week=5` → 200 boş (`has_field_data:false`) · diğer → 200 dolu ·
// `?scenario=error` → 500. Ekran `scenario`yu backend'e İLETMEZ (URL'de yalnız
// `?hafta=` vardır) — hata kadrajı `page.route` ile istek URL'sine
// `scenario=error` EKLEYEREK alınır (mock'u DEĞİŞTİRMEDEN).
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ ...WEEKLY_QURR_VIEWPORT });
  await login(page);
});

// ---------------------------------------------------------------------------
// 1) Q:72-202 · Ana ekran — başlık + tarih gezgini + segment + PF/paçal
//    kartları + 18 kolonlu tablo (Hafta 21, dolu veri)
// ---------------------------------------------------------------------------
test("haftalik qurr ana ekran gorsel", async ({ page }) => {
  await openWeeklyQurr(page, { siteId: ACTIVE_SITE_ID });
  await expect(page.getByRole("heading", { level: 1, name: "Haftalık Miktar & Birim Oran Raporu" })).toBeVisible();
  await expect(page.getByText("QURR tablosu · Hafta 21")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Kod" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "İş tipi" })).toBeVisible();
  await expect(page.getByText("Kaba İnşaat")).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("haftalik-qurr-ana.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) Q:172-182 · Kolon başlığına tıklayınca formül baloncuğu — j kolonu
//    ("Adam-saat · kalan bütçe", j = g − h)
// ---------------------------------------------------------------------------
test("haftalik qurr formul baloncugu gorsel", async ({ page }) => {
  await openWeeklyQurr(page, { siteId: ACTIVE_SITE_ID });
  await page.getByLabel("Adam-saat · kalan bütçe — formülü göster").click();
  const dialog = page.getByRole("dialog", { name: "(j) Adam-saat · kalan bütçe" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("j = g − h");
  await expect(dialog).toContainText("Güncel bütçe − kazanılmış");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("haftalik-qurr-formul-baloncugu.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) Q:204-237 · Yazdırma önizlemesi — A4 yatay, tek sayfa, kompakt tablo
// ---------------------------------------------------------------------------
test("haftalik qurr yazdirma onizlemesi gorsel", async ({ page }) => {
  await openWeeklyQurr(page, { siteId: ACTIVE_SITE_ID });
  await page.getByRole("tab", { name: "Yazdırma önizlemesi" }).click();
  await expect(page.getByText("A4 yatay · 1 sayfa · 18 kolon sayfaya sığdırıldı")).toBeVisible();
  await expect(page.getByText("QURR-H21")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("haftalik-qurr-yazdirma-onizlemesi.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 4) Q:122-129 · Veri yok haftası — istek `?hafta=5` (`EV_QURR_EMPTY_WEEK`,
//    `has_field_data:false` tetikleyicisi), ama YANIT GÖVDESİ
//    `QURR_FIXTURE_EMPTY`nin KENDİ `week_no`sunu (22) taşır — mock isteği
//    yönlendirmek için `week` kullanır, dönen gövdenin hafta numarasını
//    YENİDEN YAZMAZ (ÖLÇÜLDÜ: `qurr-fixtures.ts` `QURR_FIXTURE_EMPTY.
//    week_no === 22`, `mock-backend.ts` `EV_QURR_EMPTY_WEEK === 5`i sadece
//    İSTEK dalı seçmek için okur). Ekran bu yüzden "Hafta 22" basar.
// ---------------------------------------------------------------------------
test("haftalik qurr veri yok haftasi gorsel", async ({ page }) => {
  await openWeeklyQurr(page, { siteId: ACTIVE_SITE_ID, week: 5 });
  await expect(page.getByText("Hafta 22 için veri yok")).toBeVisible();
  await expect(page.getByText(/İlk günlük gönderildiğinde QURR kendiliğinden üretilir/)).toBeVisible();
  // last_week_no (21) ≠ week_no (22) → "geri dön" düğmesi basılı.
  await expect(page.getByRole("button", { name: "← Hafta 21'e dön" })).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("haftalik-qurr-veri-yok.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 5) Sunucu hatası — `GET …/reports/weekly` 500 (`?scenario=error` istek
//    URL'sine `page.route` ile eklenir; ekranın kendisi bu parametreyi taşımaz)
// ---------------------------------------------------------------------------
test("haftalik qurr hata gorsel", async ({ page }) => {
  await page.route("**/earned-value/reports/weekly**", async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("scenario", "error");
    await route.continue({ url: url.toString() });
  });
  await login(page);
  await page.goto(`/planlama/haftalik-qurr?site=${ACTIVE_SITE_ID}`);
  // Hata dalı `<h1>` BASMAZ (bkz. `openWeeklyQurr` dokümantasyonu) — iskelet
  // kalkması hata kartının KENDİSİYLE ölçülür.
  await expect(page.getByText("QURR raporu alınamadı")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tekrar dene" })).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("haftalik-qurr-hata.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 6) Baseline yok — Hafta 1 (409, `EV_QURR_NO_BASELINE_WEEK`)
// ---------------------------------------------------------------------------
test("haftalik qurr baseline yok gorsel", async ({ page }) => {
  await openWeeklyQurr(page, { siteId: ACTIVE_SITE_ID, week: 1 });
  await expect(page.getByText("Şantiyede aktif baseline yok")).toBeVisible();
  await expect(
    page.getByText(/QURR, dondurulmuş \(aktif\) bir bütçe baseline'ı gerektirir/),
  ).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("haftalik-qurr-baseline-yok.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 7) Q:325-333 · Tablo sonu — Σ D (Doğrudan toplam) / Σ D+DL (Doğrudan +
//    Dolaylı toplam) koyu toplam satırları.
//
// CEO BULGUSU Q1: tablo kabı `.qurr-table-card__scroll` KENDİ `max-height:
// 680px`ini taşıyan İÇ kaydırmalı bir kutudur (fullPage kadraj sayfayı
// kaydırır, bu kutuyu DEĞİL) — Σ D/Σ D+DL bu kutunun görünür alanının
// ALTINDA kalıyordu.
//
// NEDEN "KAYDIR" DEĞİL, "MAX-HEIGHT'I KALDIR": `prepareFrame` →
// `settleScrollTop` sayfadaki HER kaydırılabilir kabı (bu dâhil) SIFIRLAR
// (`e2e/visual-scroll.ts`) VE `visual-frame-guard` kanonu `toHaveScreenshot`
// tan hemen ÖNCEKİ anlamlı satırın BİREBİR `await prepareFrame(page);`
// olmasını ZORUNLU kılar (aksi ihlal olarak bekçiye düşer). Bu ikisi
// birlikte "önce kaydır, SONRA prepareFrame çağır" desenini YASAKLAR — ikinci
// çağrı kendi kaydırmamı sıfırlardı. Bunun yerine kabın `max-height`ini bu
// TEK karede `none` yaparak İÇ kaydırmayı GEREKSİZ kılıyorum: tüm satırlar
// (Σ D/Σ D+DL dâhil) normal sayfa akışına döner, `prepareFrame` hiçbir şeyi
// kaydırmaz (zaten kaydırılabilir bir şey KALMAZ) ve `fullPage` doğal olarak
// hepsini yakalar. CEO'nun asıl sorusu (satırlar VAR mı, S3 SIRASI ve koyu
// STİL mockup'la aynı mı) bu şekilde eksiksiz doğrulanır; `max-height:680px`
// kırpmasının KENDİSİ (iskeleti ekranda dursun) F3.6b kapsamı DEĞİL, ekran
// ana karesinde zaten görünür durumda.
//
// KIRPIK KARE KÖK NEDENİ (F-SUBPX-3 ajan B, ölçüldü): bu test `?hafta=`
// VERMEDEN açılır → `WeeklyQurrScreen` ilk isteği hafta PARAMETRESİZ atar,
// yanıttaki `week_no`yu URL'e YAZAR (S1 kanonikleştirme,
// `WeeklyQurrScreen.tsx:294-297` — KASITLI ürün davranışı). URL değişince
// `useWeeklyReport`in queryKey'i `"current"`dan gerçek hafta sayısına
// DEĞİŞİR (`useEvReports.ts:113-124`) — bu YENİ, önbellek dışı bir anahtar
// olduğundan İKİNCİ bir istek + ikinci bir render turu tetiklenir (ağ izinde
// doğrulandı: `…/reports/weekly` ve ardından `…/reports/weekly?week=21`,
// ~100ms arayla). Yavaş bir CI koşucusunda bu ikinci tur, testin ilk
// `aria-busy` kontrolünden SONRA ama ekran görüntüsünden ÖNCE tamamlanabilir
// ve düğüme yazılan İNLINE `style.maxHeight` bu ikinci render'da sessizce
// silinir. Düzeltme: (1) ikinci turun bitişini ZAMAN AŞIMI değil, URL'in
// kanonik hafta parametresini TAŞIDIĞINI bekleyerek ölç, SONRA `aria-busy`yi
// TEKRAR sıfır bekle; (2) düğüme değil bir `<style>` etiketine `!important`
// kural yaz — bu, React'ın yönetmediği bir katmanda yaşar ve olası bir
// sonraki remount'tan ETKİLENMEZ.
// ---------------------------------------------------------------------------
test("haftalik qurr tablo sonu gorsel", async ({ page }) => {
  await openWeeklyQurr(page, { siteId: ACTIVE_SITE_ID });
  await expect(page.getByText("Kaba İnşaat")).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  // S1 kanonikleştirmesi (yukarıdaki not): `?hafta=` yazılana VE ardından
  // gelen ikinci istek/render turu bitene kadar deterministik bekle.
  await page.waitForURL(/[?&]hafta=/);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await page.addStyleTag({ content: ".qurr-table-card__scroll { max-height: none !important; }" });
  await expect(page.getByText("Doğrudan toplam")).toBeVisible();
  await expect(page.getByText("Doğrudan + Dolaylı toplam")).toBeVisible();
  // Kalıcı bekçi: kabın hesaplanmış `max-height`i override'ı taşıyor mu —
  // ekran görüntüsü anında SESSİZCE geri dönmediğini kanıtlar.
  await expect
    .poll(() =>
      page.locator(".qurr-table-card__scroll").evaluate((node) => getComputedStyle(node).maxHeight),
    )
    .toBe("none");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("haftalik-qurr-tablo-sonu.png", { fullPage: true });
});
