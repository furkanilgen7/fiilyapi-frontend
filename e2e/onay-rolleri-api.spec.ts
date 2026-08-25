import { test, expect } from "@playwright/test";

import { WRITE_TARGET_USER_ID, login } from "./onay-rolleri-helpers";

// F-OKROL · Onay Rolleri YAZMA uçlarının ALTYAPI e2e'si (ekran DEĞİL).
//
// Neden UI'sız: `PUT /approvals/roles/{user_id}` ve `PUT /approvals/settings`
// PAYLAŞILAN mock durumunu değiştirir. Ekrandan tıklanan bir çip, aynı
// sunucuya bakan `onay-rolleri-visual.spec.ts` karesini `fullyParallel`
// altında SESSİZCE oynatırdı (F-UNIT2 dersi). Bu yüzden:
//   · rol yazması YALNIZ `WRITE_TARGET_USER_ID`ye yapılır — o kullanıcı
//     `GET /users`ta da `GET /approvals/roles`ta da YAPISAL olarak yoktur,
//     hiçbir kare onu görmez;
//   · eşik ucunda yalnız REDDEDİLEN gövde denenir — durum değişmez.
//
// 🔴 BFF KÖKÜ: `approvals` kökü `ALLOWED_ROOTS`ta (route.ts:281). Bu dosya
// PUT metodunun da o kökten geçtiğini kanıtlar — GET'in geçmesi PUT hakkında
// hiçbir şey söylemez.

test("rol atamasi TAM KUME yazar ve tekrarlari tekillestirir", async ({ page }) => {
  await login(page);

  const put = await page.request.put(
    `/api/backend/approvals/roles/${WRITE_TARGET_USER_ID}`,
    { data: { approval_roles: ["patron", "patron", "accounting"] } },
  );
  expect(put.status()).toBe(200);
  expect(await put.json()).toMatchObject({
    user_id: WRITE_TARGET_USER_ID,
    approval_roles: ["patron", "accounting"],
  });

  // TAM KÜME semantiği: gönderilmeyen rol KALKAR (kısmi ekleme ucu YOKTUR).
  const ikinci = await page.request.put(
    `/api/backend/approvals/roles/${WRITE_TARGET_USER_ID}`,
    { data: { approval_roles: ["site_chief"] } },
  );
  expect(ikinci.status()).toBe(200);
  expect((await ikinci.json()).approval_roles).toEqual(["site_chief"]);

  // 🔒 GERİ ALMA: hedef yeniden rolsüz bırakılır.
  const geri = await page.request.put(
    `/api/backend/approvals/roles/${WRITE_TARGET_USER_ID}`,
    { data: { approval_roles: [] } },
  );
  expect(geri.status()).toBe(200);
});

test("bilinmeyen rol degeri 422 alir — enum sozlesmesi bekcilenir", async ({ page }) => {
  await login(page);
  const res = await page.request.put(
    `/api/backend/approvals/roles/${WRITE_TARGET_USER_ID}`,
    { data: { approval_roles: ["muhasebe_seflik"] } },
  );
  expect(res.status()).toBe(422);
});

test("bilinmeyen kullanici 404 alir", async ({ page }) => {
  await login(page);
  const res = await page.request.put("/api/backend/approvals/roles/u-yok-boyle", {
    data: { approval_roles: [] },
  });
  expect(res.status()).toBe(404);
});

/**
 * 🔴 KONTROL SORUSU: "bu mock, gerçek backend'in REDDEDECEĞİ bir isteği
 * reddediyor mu?" — sözleşme `Field(ge=0, max_digits=18, decimal_places=2)`.
 * Reddetmeseydi istemci korkuluğu bir ONAYLAYICI üzerinde sınanmış olurdu.
 *
 * 🔒 Üç gövde de REDDEDİLİR ⇒ eşik durumu DEĞİŞMEZ, hiçbir kare oynamaz.
 */
test("esik ucu sozlesme disi govdeleri 422 ile reddeder ve durumu DEGISTIRMEZ", async ({
  page,
}) => {
  await login(page);
  const önce = await (await page.request.get("/api/backend/approvals/settings")).json();

  for (const gövde of [
    { approval_threshold_try: "-1" },
    { approval_threshold_try: "100.005" },
    { approval_threshold_try: "9".repeat(17) },
    { approval_threshold_try: "500000", baska_alan: 1 },
  ]) {
    const res = await page.request.put("/api/backend/approvals/settings", { data: gövde });
    expect(res.status(), JSON.stringify(gövde)).toBe(422);
  }

  const sonra = await (await page.request.get("/api/backend/approvals/settings")).json();
  expect(sonra).toEqual(önce);
});
