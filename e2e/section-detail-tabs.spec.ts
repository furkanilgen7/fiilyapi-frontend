import { test, expect, type Page } from "@playwright/test";

/**
 * F-BLMSEK T4 · Bölüm Detay'ın ÜÇ sekmesinin DAVRANIŞ testi (piksel DEĞİL).
 *
 * Kullanıcının şikâyeti "üç sekme de aynı görünüyor"du. T1/T2 "Günlük Kayıt" ve
 * "Hakediş"i canlıya aldı, T3 "Malzeme"yi kendi dürüst gerekçesine taşıdı. Bu
 * dosya o üçünün GERÇEKTEN ayrıştığını ve süzgeçlerin GERÇEKTEN süzdüğünü
 * ölçer.
 *
 * 🔴 SÜZGEÇLER KARŞI-KANITLA ÖLÇÜLÜR (K-IKIZ1): T4 fikstür turunda `d-2`
 * "sec-2"ye, `scpp-2` "sec-1"e, `scpp-3` "sec-2"ye taşındı. Bundan ÖNCE s-1'in
 * TÜM günlükleri sec-1'de ve TÜM hakedişleri `null` bölümdeydi — yani süzgeci
 * tamamen SİLEN bir mutant bile bu ekranı yeşil geçirirdi. Aşağıdaki
 * "GÖSTERİLMEZ" iddiaları o boşluğu kapatır.
 *
 * 🔴 READ-ONLY: yalnız GET. Hiçbir kaydı mutasyona uğratmaz, dolayısıyla
 * `fullyParallel` altında görsel spec'lerle YARIŞMAZ.
 *
 * 🔴 `getByRole("alert")` BU DOSYADA KULLANILMAZ (F-P6 kanonu). Bağlantı
 * toplayan iddialar `querySelectorAll("a[href]")` ile yapılır.
 */
const FIXED_TODAY = new Date("2026-08-20T12:00:00Z");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

async function openSection(page: Page, sectionId: string, heading: string) {
  await page.clock.setFixedTime(FIXED_TODAY);
  await login(page);
  await page.goto(`/projeler/p-1/santiyeler/s-1/bolumler/${sectionId}`);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

test("Gunluk Kayit sekmesi YALNIZ bu bolumun kayitlarini basar, disarida kalani SAYAR", async ({
  page,
}) => {
  await openSection(page, "sec-1", "Kat 6–10 Kaba İnşaat");
  await page.getByRole("tab", { name: "Günlük Kayıt" }).click();

  const panel = page.getByTestId("section-diary");
  await expect(panel).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Kat 6–10 Kaba İnşaat · Günlük Kayıtlar",
  );

  // (a) `d-1` (sec-1) BASILIR — tek satır.
  await expect(panel.locator(".section-diary__row")).toHaveCount(1);
  await expect(panel).toContainText("15 Tem");
  // `d-1`in işçi toplamı: 12 + 8 + 6 = 26.
  await expect(panel).toContainText("26 işçi");
  await expect(panel).toContainText("Kat 6–10 Kaba İnşaat");

  // (b) 🔴 KARŞI-KANIT: `d-2` sec-2'dedir ve GÖSTERİLMEZ. Bu iddia olmadan
  // süzgeci silen mutant hayatta kalırdı (T4 öncesi ikizde ikisi de sec-1'di).
  await expect(panel).not.toContainText("16 Tem");
  await expect(panel).not.toContainText("5 işçi");
  await expect(panel).not.toContainText("Zemin Kat Kaba İnşaat");

  // (c) Sessiz atlama = ihlal: dışarıda kalan SAYILIR ve nerede görüleceği yazılır.
  const note = panel.getByTestId("section-diary-note");
  await expect(note).toBeVisible();
  // 🔴 YALNIZ "başka bölüm" dalı iddia edilir — "atanmamış" dalı İDDİA EDİLEMEZ.
  // ÖLÇÜLDÜ: bu panel AY SÜZGECİ UYGULAMAZ ve `e2e/site-diary.spec.ts`
  // 2026-09 · s-1'de BÖLÜMSÜZ (`section_id: null`, mock create varsayılanı)
  // bir kayıt AÇAR. O kayıt listeye girmez ama `unassignedCount`u 0→1 yapar,
  // yani "atanmamış" dalının VARLIĞI `fullyParallel` sırasına bağlıdır.
  // `otherSectionCount` ise sabittir (yalnız `d-2` → sec-2), çünkü açılan kayıt
  // "atanmamış" sayılır, "başka bölüm" DEĞİL.
  await expect(note).toContainText("başka bölüme atanmış 1 kayıt bu listede yok");

  // (d) Notun çıkış yolu GERÇEK bir bağlantıdır (`a[href]` ile toplanır).
  const noteHrefs = await note.evaluate((el) =>
    Array.from(el.querySelectorAll("a[href]")).map((a) => a.getAttribute("href")),
  );
  expect(noteHrefs).toContain("/projeler/p-1/santiyeler/s-1/gunluk-kayit");
});

test("gunlugu olmayan bolumde 'kayit yok' der, 'kirilmiyor' DEMEZ", async ({ page }) => {
  await openSection(page, "sec-3", "Peyzaj Düzenlemesi (Taslak)");
  await page.getByRole("tab", { name: "Günlük Kayıt" }).click();

  const panel = page.getByTestId("section-diary");
  await expect(panel).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  // 🔴 "Veri YOK" ≠ "modül bu bölüme KIRILMIYOR". Bağ AÇIK; eksik olan kayıttır.
  await expect(panel).toContainText("Bu bölümde günlük kayıt yok");
  await expect(panel.locator(".section-diary__row")).toHaveCount(0);
  await expect(panel).not.toContainText("kırılmıyor");

  // Boş listede bile kart KENDİ kapsamını söyler (başlıkta bölüm adı).
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Peyzaj Düzenlemesi (Taslak) · Günlük Kayıtlar",
  );
  // s-1'in iki kaydı da BAŞKA bölümlerde → ikisi de sayılır.
  await expect(panel.getByTestId("section-diary-note")).toContainText(
    "başka bölüme atanmış 2 kayıt bu listede yok",
  );
});

test("Hakedis sekmesi bolum + 'Tum Bolumler' satirlarini basar, baska bolumu DUSURUR", async ({
  page,
}) => {
  await openSection(page, "sec-1", "Kat 6–10 Kaba İnşaat");
  await page.getByRole("tab", { name: "Hakediş" }).click();

  const panel = page.getByTestId("section-payments");
  await expect(panel).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  // Görünen küme: `scpp-2` (sec-1) + `scpp-1`, `scpp-4` (null = Tüm Bölümler)
  // + 🔴 HAK-NULL: `scpp-9` — sözleşmesi PROJE GENELİ (`sc-4`, `site_id: null`)
  // olan hakediş. Eskiden bu satır sunucudaki eşitlik süzgeci yüzünden
  // HİÇBİR bölümde görünmüyordu; canlıda sözleşmelerin HEPSİ proje geneli
  // olduğu için bu panel fiilen boştu.
  // `scpp-3` sec-2'dedir → DÜŞER. `scpp-7` `hiddenFromLists`tir.
  await expect(panel.locator(".pp-row")).toHaveCount(4);

  // (a) BU bölümün satırı GERÇEK adı basar — ekran adı zaten biliyor, pending "—" basmaz.
  await expect(panel).toContainText("Aydın Elektrik Taah. #2");
  await expect(panel).toContainText("Elektrik · Kat 6–10 Kaba İnşaat");

  // (b) `null` kapsamlı satırlar "Tüm Bölümler" basar — kapsam iddiası DARALTILMAZ.
  await expect(panel).toContainText("Aydın Elektrik Taah. #1");
  await expect(panel).toContainText("Aydın Elektrik Taah. #4");
  await expect(panel.getByText("Elektrik · Tüm Bölümler")).toHaveCount(2);

  // (b2) 🔴 HAK-NULL BEKÇİSİ: proje geneli sözleşmenin hakedişi BU bölümde
  // görünür ve o da "Tüm Bölümler" kapsamı taşır. Bu satır kaybolursa kusur
  // geri gelmiş demektir.
  await expect(panel).toContainText("Öz Genel Hizmetler #1");
  await expect(panel.getByText("Genel İşler · Tüm Bölümler")).toHaveCount(1);

  // (c) 🔴 KARŞI-KANIT: `scpp-3` (sec-2) GÖSTERİLMEZ.
  await expect(panel).not.toContainText("Aydın Elektrik Taah. #3");
  await expect(panel).not.toContainText("Zemin Kat Kaba İnşaat");

  // (d) Dışarıda kalan SAYILIR.
  await expect(panel.getByTestId("section-payments-note")).toContainText(
    "başka bölüme atanmış 1 hakediş bu listede yok",
  );

  // (e) 🔴 KAPSAM İDDİASI — SATIRLAR VARKEN de görünür. Yalnız boş dala konsaydı
  // dolu listede kullanıcı eksikliği HİÇ öğrenemezdi.
  const scope = panel.getByTestId("section-payments-scope");
  await expect(scope).toBeVisible();
  await expect(scope).toContainText("Yalnız taşeron hakedişleri listelenir");
  await expect(scope).toContainText("İşveren hakedişi bölüme kırılmıyor");
});

test("Malzeme sekmesi YER TUTUCU kalir ama kendi gerekcesini ve cikis yolunu basar", async ({
  page,
}) => {
  await openSection(page, "sec-1", "Kat 6–10 Kaba İnşaat");
  await page.getByRole("tab", { name: "Malzeme" }).click();

  const panel = page.getByTestId("section-stock");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Kat 6–10 Kaba İnşaat · Stok Hareketleri",
  );

  // Gerekçe MODÜL değil ALAN adlandırır (`/stok` CANLI, eksik olan alan).
  await expect(panel).toContainText("Stok hareketi bölüm alanı taşımıyor");
  await expect(panel).toContainText("Kat 6–10 Kaba İnşaat için ayrı stok kaydı basılmıyor");

  // 🔴 Çıkış yolu ŞANTİYE stok ekranıdır ve `?section=` TAŞIMAZ — hedef ekran
  // `useSearchParams` KULLANMAZ, parametre eklemek ÖLÜ query yazmak olurdu.
  const hrefs = await panel.evaluate((el) =>
    Array.from(el.querySelectorAll("a[href]")).map((a) => a.getAttribute("href")),
  );
  expect(hrefs).toContain("/projeler/p-1/santiyeler/s-1/stok");
  expect(hrefs.every((h) => h !== null && !h.includes("?section="))).toBe(true);
});

/**
 * 🔴 BU DİLİMİN KALBİ — KULLANICI ŞİKÂYETİNİN DOĞRUDAN BEKÇİSİ.
 *
 * Şikâyet "üç sekme de aynı görünüyor"du: üçü de jenerik
 * `${label} — bu bölümde henüz görüntülenemiyor` cümlesini basıyordu. Tek tek
 * panel testleri bu gerilemeyi YAKALAYAMAZ — her biri kendi metnini doğrular ve
 * üçü AYNI metne dönse bile üçü de yeşil kalır. Ayrım ancak ÜÇÜ BİRDEN
 * karşılaştırılınca ölçülebilir.
 */
test("uc sekmenin paneli birbirinden AYIRT EDILEBILIR", async ({ page }) => {
  await openSection(page, "sec-1", "Kat 6–10 Kaba İnşaat");

  const panelText = async (tab: string) => {
    await page.getByRole("tab", { name: tab }).click();
    const body = page.locator(".section-panel__body");
    await expect(body).toBeVisible();
    await expect(page.getByText("Yükleniyor…")).toHaveCount(0);
    return ((await body.innerText()) ?? "").trim();
  };

  const diary = await panelText("Günlük Kayıt");
  const payments = await panelText("Hakediş");
  const stock = await panelText("Malzeme");

  // (a) Üçü de GERÇEKTEN bir şey basıyor (boş metin "farklı" sayılmasın).
  for (const text of [diary, payments, stock]) {
    expect(text.length).toBeGreaterThan(40);
  }

  // (b) İKİŞER İKİŞER FARKLI.
  expect(diary).not.toEqual(payments);
  expect(diary).not.toEqual(stock);
  expect(payments).not.toEqual(stock);

  // (c) Her panel KENDİ konusunu adlandırır — "farklı" olmak yetmez, DOĞRU
  // konuda farklı olmalı (yalnız bölüm adı değişse de (b) geçerdi).
  expect(diary).toContain("Günlük Kayıtlar");
  expect(payments).toContain("Taşeron Hakedişleri");
  expect(stock).toContain("Stok Hareketleri");

  // (d) 🔴 ESKİ JENERİK CÜMLE PANELLERDEN TAMAMEN KALKTI. Görev tanımı "en çok
  // Malzeme panelinde" diyordu; ÖLÇÜM daha güçlü çıktı — T3 sonrası Malzeme
  // paneli de kendi spesifik metnini basıyor, jenerik cümle ÜÇÜNDE DE YOK.
  // (Alt satırdaki "Bölüm Malzeme Durumu" YAN KARTI onu hâlâ basar; bu yüzden
  // iddia `.section-panel__body` ile SEKME PANELİNE kapsanmıştır.)
  const generic = "— bu bölümde henüz görüntülenemiyor";
  expect(diary).not.toContain(generic);
  expect(payments).not.toContain(generic);
  expect(stock).not.toContain(generic);
});
