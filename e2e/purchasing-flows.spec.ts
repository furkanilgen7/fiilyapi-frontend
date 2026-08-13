import { readFile } from "node:fs/promises";

import { test, expect, type Page } from "@playwright/test";

// F-SA T5a · Satınalma YAZMA akışlarının fonksiyonel e2e'si (görsel DEĞİL —
// `--grep-invert "gorsel"` turunda koşar). Spec §4 smoke zincirinin ikizi:
// tedarikçi ekle → talep aç (taslak → onaya gönder) → teklif gir →
// select-and-order (TELDEN) → Excel'in İKİLİ dalı → NULL-EŞİK hükmü.
//
// 🔒 FİKSTÜR İZOLASYONU (F-ST/F-BC/F-P8 dersi): bu dosyanın doğurduğu talep ve
// siparişler `p-2` (Villa B) projesindedir; görsel kadrajların TAMAMI `p-1`
// fikstürlerine dayanır ve `pinPurchasingFixtures` ile oraya daraltılır. Mevcut
// fikstürler (tedarikçi sup-1…4, talep pr-1…6, teklif q-1…3, sipariş po-1…3)
// OYNATILMAZ: hiçbiri güncellenmez/silinmez, `pr-1`e teklif eklenmez. Yeni
// tedarikçi ucun proje süzgeci olmadığı için TED kadrajında gövde süzmeyle
// ayıklanır (gerekçe: `purchasing-visual-helpers.ts`).
//
// ⚠️ `getByRole("alert")` bu depoda YASAKTIR (F-P6 dersi) — sonuç bantları
// `data-testid` ile okunur. Sabit `waitForTimeout` da yasak; beklemeler
// locator/istek tabanlıdır.

const REQUEST_FORM_URL = "/satinalma/talep/yeni";
const SUPPLIERS_URL = "/satinalma/tedarikciler";
/** Yazma akışlarının projesi — görsel kadrajların `p-1`inden AYRI. */
const WRITE_PROJECT_ID = "p-2";
const WRITE_PROJECT_LABEL = "Villa B";
/** Fikstür talebi `pr-1` — YALNIZ okunur (Excel dalları). */
const FIXTURE_QUOTES_URL = "/satinalma/talepler/pr-1/teklifler";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** İstek yolu eşleştirmesi — sorgu dizesi karışmasın diye `pathname` ile. */
function isPath(url: string, pathname: string): boolean {
  return new URL(url).pathname === pathname;
}

/** Form GERÇEKTEN kullanılabilir: proje ve stok listeleri geldi. */
async function openRequestForm(page: Page) {
  await page.goto(REQUEST_FORM_URL);
  await expect(page.getByTestId("talep-proje")).toBeEnabled();
  await expect(page.getByTestId("talep-malzeme-0")).toBeEnabled();
}

interface DraftRequest {
  id: string;
  request_no: string;
  status: string;
}

/**
 * Formu doldurup "Taslak Kaydet"e basar; SUNUCUNUN döndürdüğü talebi verir.
 * Numara ve kimlik istemcide UYDURULMAZ — ikisi de yanıttan okunur (mock
 * numarayı sırayla üretir, paralel koşuda sabit değildir).
 */
async function saveDraftRequest(
  page: Page,
  line: { stockItemId: string; quantity: string; unitPrice?: string },
): Promise<DraftRequest> {
  await page.getByTestId("talep-proje").selectOption({ label: WRITE_PROJECT_LABEL });
  await page.getByTestId("talep-ihtiyac-tarihi").fill("2026-09-15");
  await page.getByTestId("talep-malzeme-0").selectOption(line.stockItemId);
  await page.getByTestId("talep-miktar-0").fill(line.quantity);
  if (line.unitPrice !== undefined) {
    await page.getByTestId("talep-fiyat-0").fill(line.unitPrice);
  }

  const created = page.waitForResponse(
    (response) =>
      isPath(response.url(), "/api/backend/purchase-requests") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Taslak Kaydet" }).click();
  return (await (await created).json()) as DraftRequest;
}

test("tedarikçi ekle diyaloğu yeni kartı ızgaraya düşürür", async ({ page }) => {
  const supplierName = "Ege Nakliyat ve Lojistik A.Ş.";

  await login(page);
  await page.goto(SUPPLIERS_URL);
  await expect(page.getByTestId("ted-card-sup-1")).toBeVisible();

  await page.getByRole("button", { name: "+ Tedarikçi Ekle" }).click();
  const dialog = page.getByRole("dialog", { name: "Yeni Tedarikçi" });
  await dialog.getByLabel("Tedarikçi Adı").fill(supplierName);
  await dialog.getByLabel("Kategori").fill("Nakliye");
  await dialog.getByLabel("İletişim").fill("0232 444 55 66");
  await dialog.getByLabel("Ödeme Vadesi").selectOption("days_15");

  const created = page.waitForResponse(
    (response) =>
      isPath(response.url(), "/api/backend/suppliers") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  const supplier = (await (await created).json()) as { id: string };

  // Diyalog kapandı ve kart GERÇEKTEN doğdu (listeyi tazeleyen invalidate).
  await expect(dialog).toHaveCount(0);
  const card = page.getByTestId(`ted-card-${supplier.id}`);
  await expect(card).toContainText(supplierName);
  await expect(card).toContainText("Nakliye");
  await expect(card).toContainText("15 gün");
  // Siparişsiz tedarikçide "veri yok" DEĞİL sıfır — sunucu türevi.
  await expect(card).toContainText("Bu yıl hiç sipariş verilmedi");
});

test("talep aç: taslak kaydedilince numara basılır, onaya gönderilince durum değişir", async ({
  page,
}) => {
  await login(page);
  await openRequestForm(page);

  const draft = await saveDraftRequest(page, {
    stockItemId: "it-1",
    quantity: "5",
    unitPrice: "1000",
  });

  // Numarayı SUNUCU üretir; salt-okunur alan onu basar (uydurma numara yok).
  expect(draft.status).toBe("draft");
  await expect(page.getByTestId("talep-no")).toHaveValue(draft.request_no);
  await expect(page.getByTestId("talep-kayit-sonuc")).toContainText(draft.request_no);

  // İKİ ADIMLI gönderim: `PATCH` + `POST /{id}/submit` (tek adımlı uç YOK).
  const submitted = page.waitForResponse(
    (response) =>
      isPath(response.url(), `/api/backend/purchase-requests/${draft.id}/submit`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Onaya Gönder" }).first().click();
  const submittedBody = (await (await submitted).json()) as { status: string };

  // TELDEN: durum sunucuda gerçekten değişti…
  expect(submittedBody.status).toBe("pending_approval");
  // …ve ekran talep listesine döndü, satır yeni rozetiyle görünüyor.
  await expect(page).toHaveURL(/\/satinalma$/);
  await page.goto(`/satinalma?proje=${WRITE_PROJECT_ID}`);
  await expect(page.getByTestId(`sat-status-${draft.request_no}`)).toHaveText("Onay Bekliyor");
});

test("teklif gir → sipariş ver: select-and-order telden gider, talep ordered olur", async ({
  page,
}) => {
  const supplierLabel = "Demir Çelik Ticaret Ltd.";

  await login(page);
  await openRequestForm(page);
  const draft = await saveDraftRequest(page, {
    stockItemId: "it-2",
    quantity: "10",
    unitPrice: "250",
  });

  await page.goto(`/satinalma/talepler/${draft.id}/teklifler`);
  await expect(page.getByTestId("tek-empty")).toHaveText(
    "Bu talep için henüz teklif girilmedi.",
  );

  // 1) Teklif girişi (türetilmiş minimal diyalog, spec K5).
  await page.getByTestId("tek-add-quote").click();
  const quoteDialog = page.getByRole("dialog", { name: "Yeni Teklif" });
  await quoteDialog.getByLabel("Tedarikçi").selectOption({ label: supplierLabel });
  await quoteDialog.getByLabel("Birim Fiyat").fill("300");
  await quoteDialog.getByLabel("Teslimat").fill("2 iş günü");

  const quoteCreated = page.waitForResponse(
    (response) =>
      isPath(response.url(), `/api/backend/purchase-requests/${draft.id}/quotes`) &&
      response.request().method() === "POST",
  );
  await quoteDialog.getByRole("button", { name: "Kaydet" }).click();
  const quote = (await (await quoteCreated).json()) as { id: string };

  await expect(page.getByTestId("tek-empty")).toHaveCount(0);
  const card = page.getByTestId(`tek-card-${quote.id}`);
  await expect(card).toContainText(supplierLabel);
  // Toplam SUNUCU türevidir (10 × 300 = 3.000); istemci çarpmaz.
  await expect(page.getByTestId(`tek-total-${quote.id}`)).toContainText("3.000");
  // Tek teklif → sunucunun "en iyi fiyat" damgası onda.
  await expect(page.getByTestId(`tek-best-${quote.id}`)).toBeVisible();

  // 2) "Sipariş Ver" → ONAY diyalogu (işlem geri alınamaz, tek tıkla olmaz).
  await page.getByTestId("tek-order-best").click();
  const confirmDialog = page.getByRole("dialog", { name: "Siparişi onaylıyor musunuz?" });
  await expect(confirmDialog).toContainText(supplierLabel);

  // 🔴 TELDEN KANIT: isteğin GERÇEKTEN gittiği tıklamadan ÖNCE beklemeye alınır.
  const selectAndOrder = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      isPath(
        request.url(),
        `/api/backend/purchase-requests/${draft.id}/quotes/${quote.id}/select-and-order`,
      ),
  );
  await confirmDialog.getByRole("button", { name: "Sipariş Ver" }).click();
  await selectAndOrder;

  // 3) Sonuç EKRANDA görünür: sunucunun doğurduğu sipariş numarası.
  const result = page.getByTestId("tek-order-result");
  await expect(result).toContainText("Sipariş oluşturuldu");
  const orderNo = /SP-\d{4}-\d{4}/.exec(await result.innerText())?.[0];
  expect(orderNo).toBeTruthy();
  // Kart artık seçim düğmesi değil, seçildi bilgisi basıyor.
  await expect(page.getByTestId(`tek-selected-${quote.id}`)).toBeVisible();

  // 4) Talep `ordered`a döndü…
  await page.goto(`/satinalma?proje=${WRITE_PROJECT_ID}`);
  await expect(page.getByTestId(`sat-status-${draft.request_no}`)).toHaveText("Sipariş Verildi");

  // 5) …ve sipariş SİPARİŞLER listesinde, talep numarasıyla birlikte.
  await page.goto(`/satinalma/siparisler?proje=${WRITE_PROJECT_ID}`);
  const orderRow = page.getByTestId(`sip-row-${orderNo}`);
  await expect(orderRow).toContainText(supplierLabel);
  await expect(page.getByTestId(`sip-request-${orderNo}`)).toHaveText(draft.request_no);
});

/**
 * İndirilen dosya GERÇEKTEN ikili mi — ad yetmez: BFF ikili gövdeyi JSON
 * sanıp bozarsa dosya iner ama içeriği çöp olur. `PK\x03\x04` xlsx (zip)
 * imzasıdır ve mock'un ürettiği baytlarla birebir aynıdır (`timesheet.spec.ts`
 * emsali).
 */
test("Excel dışa aktarımı ikili iner (dosya adı + zip imzası)", async ({ page }) => {
  await login(page);
  await page.goto(FIXTURE_QUOTES_URL);
  await expect(page.getByTestId("tek-card-q-1")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("tek-export").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("teklif-karsilastirma.xlsx");
  const bytes = await readFile(await download.path());
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
});

test("Excel ucu 404 verince JSON dalına düşer: dosya inmez, sunucunun cümlesi basılır", async ({
  page,
}) => {
  await login(page);
  // Var olmayan talep — uç 404 + JSON gövde döner (WORKFLOW §4: `status >= 400`
  // HER ZAMAN JSON dalı; ikili dal `Content-Type`a bakar).
  await page.goto("/satinalma/talepler/pr-yok-9999/teklifler");
  await expect(page.getByTestId("tek-export")).toBeVisible();

  let downloaded = false;
  page.on("download", () => {
    downloaded = true;
  });

  const failed = page.waitForResponse(
    (response) =>
      isPath(
        response.url(),
        "/api/backend/purchase-requests/pr-yok-9999/quotes/export.xlsx",
      ) && response.status() === 404,
  );
  await page.getByTestId("tek-export").click();
  await failed;

  // Sabit cümle DEĞİL, sunucunun kendi Türkçe gerekçesi basılır.
  await expect(page.getByTestId("tek-action-error")).toContainText("Talep bulunamadı.");
  expect(downloaded).toBe(false);
});

test("NULL-EŞİK: fiyatsız kalemde onay kutusu “gerekmiyor” demez", async ({ page }) => {
  await login(page);
  await openRequestForm(page);

  // Kalem var, MİKTAR var, FİYAT YOK → tutar hesaplanamaz.
  await page.getByTestId("talep-proje").selectOption({ label: WRITE_PROJECT_LABEL });
  await page.getByTestId("talep-malzeme-0").selectOption("it-1");
  await page.getByTestId("talep-miktar-0").fill("12");

  // 🔴 FAIL-CLOSED (SA kanonu): bilinmeyen tutar KÜÇÜK değil BÜYÜK sayılır —
  // "gerekmiyor" yazmak ₺2M'lik bir talebi tek boş kutuyla eşiğin altında
  // GÖSTERİRDİ. Toplamın EKSİK olduğu da ayrıca yazılır (sessiz 0 sayma yok).
  const outcome = page.getByTestId("talep-onay-sonuc");
  await expect(outcome).toContainText("Patron onayı gerekebilir");
  await expect(outcome).not.toContainText("gerekmiyor");
  await expect(page.getByTestId("talep-toplam-eksik")).toContainText("EKSİKTİR");

  // KARŞIT KANIT: fiyat girilince hüküm netleşir ve eksiklik bandı kapanır.
  await page.getByTestId("talep-fiyat-0").fill("1000");
  await expect(outcome).toContainText("Patron onayı gerekmiyor");
  await expect(page.getByTestId("talep-toplam-eksik")).toHaveCount(0);
});
