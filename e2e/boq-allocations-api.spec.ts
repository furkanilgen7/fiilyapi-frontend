import { test, expect, type Page } from "@playwright/test";

/**
 * F-BLMPOZ · POZİTİF KONTROL — test ikizinin TAHSİS kapıları GERÇEKTEN
 * reddediyor mu? (`PUT /boq/items/{item_id}/allocations`)
 *
 * 🔴 NEDEN VAR. Bu uç bu dilimde ikize YENİ eklendi. Kapıları olmayan bir ikiz
 * ONAYLAYICIDIR, bekçi değil (K-MKD2): `quantity`nin STRICT pozitif olduğunu ya
 * da `allocations` alanının zorunluluğunu istemciden silen bir mutasyon
 * e2e'de HİÇBİR ŞEY kırmazdı. Bir kapının VAR olduğunu geçen testler söylemez
 * (K-IKIZ1) — kapıyı ölçen tek şey kapıya ÇARPAN bir istektir.
 *
 * 🔴 AYRICA BU DOSYA BFF KÖKÜNÜ DE ÖLÇER: `boq` kökü `ALLOWED_ROOTS`ta
 * olmasaydı bu istekler YALNIZ CANLIDA 404 alırdı ve jsdom testleri görmezdi.
 * İstek `/api/backend/boq/...` üzerinden gider, yani proxy yolu gerçekten
 * katedilir.
 *
 * 🔒 FİKSTÜR İZOLASYONU YAPISALDIR — ve burada ZORUNLUDUR: ikizin state'i
 * sunucu ÖMRÜ boyunca tektir ve `fullyParallel` işçiler onu PAYLAŞIR. Başarılı
 * bir tahsis yazması `sec-1`in İş Kalemleri sekmesini ve BOQ görsel karelerini
 * KAYDIRIRDI. Bu yüzden bu dosyadaki HER istek REDDEDİLİR (422/404/409) ya da
 * SALT OKUNURDUR (GET) — hiçbiri `state.boqAllocations`a dokunmaz.
 *
 * Karşıt kanıt, emsalin (`twin-enum-gate-api.spec.ts`) tekniğiyle ve
 * MUTASYONSUZ üretilir: sözleşmeye UYAN bir gövde alan kapılarını GEÇER ve
 * DAHA SONRAKİ bir kurala (kota aşımı) takılır. Hata kodunun 422'den 409'a
 * DEĞİŞMESİ kapının seçici olduğunun kanıtıdır — her gövdeye 422 veren bozuk
 * bir uç bu testi geçemez.
 */
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

// bi-1: kota 1240, sec-1'de 400 + sec-2'de 300 tahsisli.
const ITEM = "/api/backend/boq/items/bi-1/allocations";

test("GET tahsis ucu pozun BUTUN bolum paylarini dondurur (BFF koku dahil)", async ({ page }) => {
  await login(page);

  const response = await page.request.get(ITEM);
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as {
    allocations: Array<{ section_id: string; quantity: string }>;
  };

  // 🔴 KISMİ GÖRÜŞ TUZAĞI: bu uç kümenin TAMAMINI döndürmezse, PUT yazan ekran
  // görmediği payı siler. İki bölüm de gövdede OLMALI.
  const sections = body.allocations.map((a) => a.section_id).sort();
  expect(sections).toEqual(["sec-1", "sec-2"]);
});

test("PUT `allocations` alani ZORUNLUDUR — gonderilmezse 422", async ({ page }) => {
  await login(page);

  // "Dokunma" anlamı YOKTUR: alanı düşürmeyi sessizce "değiştirme"ye
  // yorumlamak, kullanıcının niyetini SUNUCUNUN uydurması olurdu.
  const missing = await page.request.put(ITEM, { data: {} });
  expect(missing.status(), await missing.text()).toBe(422);

  const nulled = await page.request.put(ITEM, { data: { allocations: null } });
  expect(nulled.status(), await nulled.text()).toBe(422);
});

test("PUT `quantity` STRICT pozitiftir — sifir ve negatif 422", async ({ page }) => {
  await login(page);

  for (const quantity of ["0", "0.000", "-5"]) {
    const response = await page.request.put(ITEM, {
      data: { allocations: [{ section_id: "sec-1", quantity }] },
    });
    expect(response.status(), `quantity=${quantity} reddedilmeli: ${await response.text()}`).toBe(
      422,
    );
  }
});

test("PUT bilinmeyen bolume tahsis yazamaz — 404", async ({ page }) => {
  await login(page);

  const response = await page.request.put(ITEM, {
    data: { allocations: [{ section_id: "boyle-bir-bolum-yok", quantity: "1" }] },
  });
  expect(response.status(), await response.text()).toBe(404);
});

test("KARSIT KANIT: sozlesmeye uyan govde ALAN kapilarini GECER, kota kuralina takilir", async ({
  page,
}) => {
  await login(page);

  // Alan kapıları (zorunluluk · gt=0 · bölüm varlığı) HEPSİ geçilir; kalan tek
  // kural kotadır. bi-1'in kotası 1240 — 2000 istemek 409 vermeli.
  const response = await page.request.put(ITEM, {
    data: { allocations: [{ section_id: "sec-1", quantity: "2000" }] },
  });

  expect(
    response.status(),
    `alan kapilari gecilmeli, hata ARTIK kota kuralindan gelmeli: ${await response.text()}`,
  ).toBe(409);
  expect(JSON.stringify(await response.json())).toContain(
    "Bölümlere dağıtılan miktar poz miktarını aşamaz",
  );

  // 🔒 Reddedilen yazma hiçbir kaydı oynatmadı — küme fikstürdeki hâlindedir.
  const after = await page.request.get(ITEM);
  const body = (await after.json()) as { allocations: Array<{ section_id: string }> };
  expect(body.allocations.map((a) => a.section_id).sort()).toEqual(["sec-1", "sec-2"]);
});

test("PUT bilinmeyen poz 404 dondurur", async ({ page }) => {
  await login(page);

  const response = await page.request.put("/api/backend/boq/items/yok-boyle-poz/allocations", {
    data: { allocations: [] },
  });
  expect(response.status()).toBe(404);
});
