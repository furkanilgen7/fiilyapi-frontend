import { test, expect, type Page } from "@playwright/test";

import { login, openInstruments } from "./financial-instruments-helpers";

/**
 * F-CEK · **YENİ ÇEK / SENET** formu — `POST /financial-instruments`.
 * Kanonik mockup: `projedesign/Form - Cek Ekle.dc.html` ("FCE").
 *
 * 🔴🔴 **BU DOSYANIN ASIL İŞİ: SAHTE BACKEND'İN BEKÇİ OLDUĞUNU KANITLAMAK.**
 *
 * F-BORDONEM ölçtü: mock'un kısıt kapısı YALNIZ SORGU parametrelerini
 * kapsıyordu, gövde alanları kapsam DIŞIYDI — `POST /payroll/periods`
 * gövdesinde `year: 1999` mock'ta **201**, canlıda **422** alıyordu; yani
 * formun korkuluğunu kaldıran mutasyon HİÇBİR e2e'yi kırmıyordu.
 *
 * Bu dilim **tamamen gövde kısıtlarından ibarettir** ve kısıtların HİÇBİRİ
 * sayısal sınır DEĞİLDİR (`maxLength` · `minLength` · `enum` ·
 * `exclusiveMinimum` · `additionalProperties:false` · alanlar-arası vade
 * kuralı). Aşağıdaki her iddia, mock'un gerçek backend'in REDDEDECEĞİNİ
 * gerçekten REDDETTİĞİNİ ölçer. *Sahte backend kabul ediyorsa ONAYLAYICIDIR,
 * bekçi değil.*
 *
 * 🔒 **MUTASYON ADASI YOKTUR ÇÜNKÜ MUTASYON YOKTUR:** mock 201 döner ama
 * kaydı listeye EKLEMEZ (gerekçe `mock-backend.ts`te). `fullyParallel: true`
 * altında listeye eklenen tek satır üç sekmenin `toHaveCount` iddiasını ve
 * iki görsel kareyi koşu sırasına bağlı olarak oynatırdı.
 *
 * ⚠️ Sabit `waitForTimeout` YOKTUR. ⚠️ `getByRole("alert")` bu depoda YASAKTIR.
 */

const CREATE_URL = "/api/backend/financial-instruments";

/** Sözleşmenin kabul ettiği TAM gövde — her testte ihlal edilecek taban. */
function validBody(): Record<string, unknown> {
  return {
    instrument_kind: "cheque",
    direction: "received",
    serial_no: "0123456789",
    drawer_name: "Güneşkent Gayrimenkul A.Ş.",
    issue_date: "2026-08-20",
    due_date: "2026-09-20",
    amount: "1200000.00",
  };
}

async function post(page: Page, body: Record<string, unknown>) {
  return page.request.post(CREATE_URL, { data: body });
}

/* ── 1) Ekranın yazma akışı ──────────────────────────────────────────────── */

test("E10:65 dugmesi formu ACAR ve FCE yuzeyleri basilir", async ({ page }) => {
  await login(page);
  await openInstruments(page);

  await page.getByTestId("fin-add").click();
  const dialog = page.getByRole("dialog", { name: "Yeni Çek / Senet" });
  await expect(dialog).toBeVisible();

  // FCE:41-45 — dört bileşim; rozet iki segmentten TÜRER.
  await expect(page.getByTestId("fin-form-composition")).toHaveText("ALINAN ÇEK");
  await page.getByTestId("fin-form-direction-issued").click();
  await page.getByTestId("fin-form-kind-promissory_note").click();
  await expect(page.getByTestId("fin-form-composition")).toHaveText("VERİLEN SENET");

  // FCE:48 — durum alanı YOK.
  await expect(dialog.getByLabel(/durum/i)).toHaveCount(0);

  // Boş formda kaydet KAPALI ve gerekçesi footer'da OKUNUR.
  await expect(page.getByTestId("fin-form-submit")).toBeDisabled();
  await expect(page.getByTestId("fin-form-block-reason")).toBeVisible();
});

test("🔴 FCE:141-147 vade hatasi ALANIN ALTINDA basilir ve kaydi KAPATIR", async ({ page }) => {
  await login(page);
  await openInstruments(page);
  await page.getByTestId("fin-add").click();

  await page.getByTestId("fin-form-serial").fill("0123456789");
  await page.getByTestId("fin-form-drawer").fill("Güneşkent Gayrimenkul A.Ş.");
  await page.getByTestId("fin-form-amount").fill("1200000,00");
  await page.getByTestId("fin-form-issue").fill("20.08.2026");
  await page.getByTestId("fin-form-due").fill("10.08.2026");

  await expect(page.getByTestId("fin-form-due")).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Vade, keşide tarihinden önce olamaz — en az 20.08.2026 olmalı"),
  ).toBeVisible();
  await expect(page.getByTestId("fin-form-submit")).toBeDisabled();

  // Düzeltilince kapı AÇILIR — kapı "her şeye hayır" demiyor (negatif kontrol).
  await page.getByTestId("fin-form-due").fill("20.09.2026");
  await expect(page.getByTestId("fin-form-submit")).toBeEnabled();
});

test("gecerli form KAYDEDILIR ve diyalog KAPANIR", async ({ page }) => {
  await login(page);
  await openInstruments(page);
  await page.getByTestId("fin-add").click();

  await page.getByTestId("fin-form-serial").fill("F-CEK-E2E-0001");
  await page.getByTestId("fin-form-drawer").fill("E2E Keşideci A.Ş.");
  await page.getByTestId("fin-form-amount").fill("1234,56");
  await page.getByTestId("fin-form-issue").fill("20.08.2026");
  await page.getByTestId("fin-form-due").fill("20.09.2026");
  await page.getByTestId("fin-form-bank").fill("Ziraat Bankası");
  await page.getByTestId("fin-form-submit").click();

  await expect(page.getByRole("dialog", { name: "Yeni Çek / Senet" })).toHaveCount(0);
  await expect(page.getByTestId("fin-form-error")).toHaveCount(0);
  // Liste DEĞİŞMEZ (mock kaydı listeye eklemez — fikstür izolasyonu).
  await expect(page.getByTestId("fin-row")).toHaveCount(5);
});

/* ── 2) 🔴 MOCK GERÇEKTEN BEKÇİ Mİ? — gövde kapısının ÖLÇÜMÜ ──────────────── */

test("🔴 NEGATIF KONTROL · sozlesmeye uyan govde 201 doner", async ({ page }) => {
  await login(page);
  const response = await post(page, validBody());
  expect(response.status(), await response.text()).toBe(201);
  const created = (await response.json()) as { status: string; id: string };
  // Yeni kayıt HER ZAMAN portföyde doğar (durum gövdeden gelmez).
  expect(created.status).toBe("portfolio");
});

test("🔴 maxLength ASIMI 422 doner — SINIR DEGERI kabul edilir", async ({ page }) => {
  await login(page);

  // `serial_no` ≤ 50
  expect((await post(page, { ...validBody(), serial_no: "x".repeat(50) })).status()).toBe(201);
  const overSerial = await post(page, { ...validBody(), serial_no: "x".repeat(51) });
  expect(overSerial.status(), "51 karakter ⇒ 422").toBe(422);
  expect(JSON.stringify(await overSerial.json())).toContain(
    "String should have at most 50 characters",
  );

  // `drawer_name` ≤ 200
  const overDrawer = await post(page, { ...validBody(), drawer_name: "x".repeat(201) });
  expect(overDrawer.status()).toBe(422);
  expect(JSON.stringify(await overDrawer.json())).toContain(
    "String should have at most 200 characters",
  );

  // `description` ≤ 200 (OPSİYONEL alanın sınırı da uygulanır)
  const overDesc = await post(page, { ...validBody(), description: "x".repeat(201) });
  expect(overDesc.status()).toBe(422);

  // `bank_name` ≤ 100 — 🔴 DENETİM SAPMASI 1: serbest METİNDİR, kapalı liste
  // değil; mockup'ta olmayan bir banka adı KABUL edilmeli.
  expect((await post(page, { ...validBody(), bank_name: "Kuveyt Türk" })).status()).toBe(201);
  const overBank = await post(page, { ...validBody(), bank_name: "x".repeat(101) });
  expect(overBank.status()).toBe(422);
  expect(JSON.stringify(await overBank.json())).toContain(
    "String should have at most 100 characters",
  );
});

test("🔴 BOS DIZE 422 doner (minLength 1) — 'gonderilmedi' ile ayni sey DEGIL", async ({
  page,
}) => {
  await login(page);
  const empty = await post(page, { ...validBody(), serial_no: "" });
  expect(empty.status()).toBe(422);
  expect(JSON.stringify(await empty.json())).toContain(
    "String should have at least 1 character",
  );
  // Opsiyonel alan HİÇ gönderilmezse geçerlidir (formun kurduğu gövde budur).
  expect((await post(page, validBody())).status()).toBe(201);
  // Ama BOŞ DİZE olarak gönderilirse 422 — form bu yüzden boş alanı gövdeye
  // hiç koymaz.
  expect((await post(page, { ...validBody(), description: "" })).status()).toBe(422);
});

test("🔴 `status` GOVDEYE GIREMEZ (additionalProperties:false) ⇒ 422", async ({ page }) => {
  await login(page);
  const withStatus = await post(page, { ...validBody(), status: "collected" });
  expect(withStatus.status(), "durum gövdede ⇒ 422").toBe(422);
  expect(JSON.stringify(await withStatus.json())).toContain("Extra inputs are not permitted");
});

test("🔴 zorunlu alan EKSIKSE 422; tanINMAYAN enum uyesi 422", async ({ page }) => {
  await login(page);

  const missing = { ...validBody() };
  delete missing.drawer_name;
  const response = await post(page, missing);
  expect(response.status()).toBe(422);
  expect(JSON.stringify(await response.json())).toContain("Field required");

  const badKind = await post(page, { ...validBody(), instrument_kind: "bond" });
  expect(badKind.status()).toBe(422);
  expect(JSON.stringify(await badKind.json())).toContain(
    "Input should be 'cheque' or 'promissory_note'",
  );

  const badDirection = await post(page, { ...validBody(), direction: "inbound" });
  expect(badDirection.status()).toBe(422);
  expect(JSON.stringify(await badDirection.json())).toContain(
    "Input should be 'received' or 'issued'",
  );
});

test("🔴 `amount` sifir/negatif 422; UC ondalik basamak 422; iki basamak 201", async ({
  page,
}) => {
  await login(page);
  expect((await post(page, { ...validBody(), amount: "0" })).status()).toBe(422);
  expect((await post(page, { ...validBody(), amount: "-5.00" })).status()).toBe(422);

  const overScale = await post(page, { ...validBody(), amount: "0.005" });
  expect(overScale.status(), "0.005 sessizce YUVARLANMAZ").toBe(422);
  expect(JSON.stringify(await overScale.json())).toContain("no more than 2 decimal places");

  expect((await post(page, { ...validBody(), amount: "0.01" })).status()).toBe(201);
});

/**
 * 🔴 **ALANLAR ARASI kısıt — şemada İFADE EDİLEMEZ ama SUNUCU UYGULAR.**
 * Uç açıklaması birebir: *"`due_date < issue_date` → 422"*. Yani formdaki
 * korkuluk bir *kolaylık* DEĞİL, sunucu kuralının AYNASIDIR.
 */
test("🔴 vade kesideden ONCEYSE sunucu 422 doner; AYNI GUN gecerlidir", async ({ page }) => {
  await login(page);
  const early = await post(page, {
    ...validBody(),
    issue_date: "2026-08-20",
    due_date: "2026-08-10",
  });
  expect(early.status()).toBe(422);
  expect(JSON.stringify(await early.json())).toContain("Vade keşide tarihinden önce olamaz");

  const sameDay = await post(page, {
    ...validBody(),
    issue_date: "2026-08-20",
    due_date: "2026-08-20",
  });
  expect(sameDay.status(), "aynı gün geçerlidir (`<` kuralı, `<=` değil)").toBe(201);
});

test("var olmayan proje/banka hesabi 404 doner", async ({ page }) => {
  await login(page);
  const badProject = await post(page, {
    ...validBody(),
    project_id: "00000000-0000-4000-8000-000000000000",
  });
  expect(badProject.status()).toBe(404);

  const badAccount = await post(page, {
    ...validBody(),
    bank_account_id: "00000000-0000-4000-8000-000000000000",
  });
  expect(badAccount.status()).toBe(404);
});

/**
 * 🔴 **BFF KÖKÜ ÖLÇÜMÜ.** `financial-instruments` `ALLOWED_ROOTS`ta olmasaydı
 * modül YALNIZ CANLIDA 404 verirdi ve jsdom bunu GÖRMEZDİ. Yukarıdaki her
 * 201/422 zaten BFF üzerinden geçiyor; bu test kökün YAZMA yönünde de açık
 * olduğunu AÇIKÇA çakar (izin listesi GET/POST ayırmaz, ama bekçi yazılı olsun).
 */
test("BFF `financial-instruments` kokunu YAZMA yonunde de gecirir", async ({ page }) => {
  await login(page);
  const response = await post(page, validBody());
  expect(response.status(), "404 gelirse kök ALLOWED_ROOTS'ta YOK demektir").not.toBe(404);
});
