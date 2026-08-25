import { test, expect, type Page } from "@playwright/test";

import { loginForPayroll } from "./payroll-helpers";

/**
 * F-BORDRO T1 · bordro modülünün **AÇILIŞ SÖZLEŞMESİ** — ekran DEĞİL, uç.
 *
 * 🔴 NEDEN AYRI BİR DOSYA: `bordro.spec.ts` ve `bordro-visual.spec.ts`
 * ikisi de **zaten açılmış ve zaten dolu** dönemleri kullanır. Modülün
 * gerçek İLK KURULUM hâli — "tablo boş, kullanıcı ayı kendi açar" — hiçbir
 * kapıda temsil edilmiyordu; 6173 testlik paket bu yüzden canlıdaki
 * *"bordro kısmı çalışmıyor"* kusurunu göremedi.
 *
 * Bu dosya SAHTE BACKEND'İ SÖZLEŞMEYE KARŞI ÖLÇER. İki iddia gerçek
 * backend'den ÖLÇÜLDÜ (`payroll/router.py` · `payroll/service.py`):
 *
 *   1. `POST /payroll/periods` — *"Ay AÇAR, doldurmaz — satırlar `compute`
 *      ucundan gelir."* ⇒ yeni dönem **SIFIR satırlıdır**.
 *   2. `POST /payroll/periods/{id}/compute` — `created` = *"Yeni açılan satır
 *      sayısı"* (şema açıklaması) ⇒ ilk hesap satırları **gerçekten üretir**
 *      ve sayar; ikinci hesap aynı satırları **günceller** (`created` = 0).
 *
 * Ayrıca `compute` yanıtının BEŞİNCİ alanı `missing_prior_period_count`
 * (K4 · eksik kümülatif matrah uyarısı) sözleşmede ZORUNLUDUR.
 *
 * 🔒 MUTASYON ADASI: yalnız **2025** ve KENDİ ayları (01/02/03). Kadrajların
 * yılı (2026) ve oransız yıl (2024) bu dosyadan HİÇ etkilenmez; yeni bir YIL
 * açmak `bordro-gecmis` karesinin yıl seçicisini oynatırdı — 2025 zaten
 * seçenekte olduğu için kare sabit kalır. `fullyParallel` altında aynı
 * dosyanın testleri başka worker'larda eşzamanlı koşabildiği için ay ayrımı
 * zorunludur (`PAYROLL_PERIOD_SEEDS` kanonu).
 *
 * ⚠️ Sabit `waitForTimeout` YOKTUR. ⚠️ `getByRole("alert")` bu depoda YASAKTIR.
 */

interface ApiLine {
  id: string;
  personnel_source: string;
  status: string;
  gross_amount: string | null;
}

interface ApiDetail {
  id: string;
  year: number;
  month: number;
  status: string;
  payment_due_date: string | null;
  summary: { line_count: number; gross_total: string; net_total: string };
  sections: { personnel_source: string; line_count: number; lines: ApiLine[] }[];
}

interface ApiComputeResult {
  created: number;
  updated: number;
  skipped_overridden: number;
  skipped_approved: number;
  missing_prior_period_count: number;
}

function allLines(detail: ApiDetail): ApiLine[] {
  return detail.sections.flatMap((section) => section.lines);
}

async function createPeriod(
  page: Page,
  body: { year: number; month: number; payment_due_date?: string | null },
): Promise<ApiDetail> {
  const response = await page.request.post("/api/backend/payroll/periods", { data: body });
  expect(response.status(), `dönem açma 201 dönmeli: ${await response.text()}`).toBe(201);
  return (await response.json()) as ApiDetail;
}

async function compute(page: Page, periodId: string): Promise<ApiComputeResult> {
  const response = await page.request.post(
    `/api/backend/payroll/periods/${periodId}/compute`,
  );
  expect(response.status(), `hesap 200 dönmeli: ${await response.text()}`).toBe(200);
  return (await response.json()) as ApiComputeResult;
}

async function getDetail(page: Page, periodId: string): Promise<ApiDetail> {
  const response = await page.request.get(`/api/backend/payroll/periods/${periodId}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as ApiDetail;
}

/* ── 1) AÇILIŞ SÖZLEŞMESİ · aç → BOŞ · hesapla → DOLU ────────────────────── */

test("donem acmak satir URETMEZ; satirlari compute uretir ve created sayar", async ({
  page,
}) => {
  await loginForPayroll(page);

  const created = await createPeriod(page, { year: 2025, month: 1 });

  // 🔴 ÇEKİRDEK İDDİA 1 — gerçek backend ayı AÇAR, DOLDURMAZ. Sahte backend
  // burada 7 satırlık dolu bir dönem döndürüyorsa, harness modülün gerçek
  // ilk-kurulum hâlini YAPISAL OLARAK üretemiyor demektir.
  expect(allLines(created).length, "yeni dönem SIFIR satırlıdır").toBe(0);
  expect(created.summary.line_count, "özet satır sayısı da sıfırdır").toBe(0);
  expect(created.status, "yeni dönem HER ZAMAN draft'tır").toBe("draft");
  // Satırı olmayan dönemin toplamları SIFIRDIR — `null` değil (ekran "—"
  // basmasın diye) ve uydurma bir sayı hiç değil.
  expect(created.summary.gross_total).toBe("0.00");
  expect(created.summary.net_total).toBe("0.00");

  // Liste ucu da aynı şeyi söyler: dönem AÇILDI ama kimse yok.
  const listRow = await getDetail(page, created.id);
  expect(listRow.summary.line_count).toBe(0);

  const first = await compute(page, created.id);

  // 🔴 ÇEKİRDEK İDDİA 2 — `created` = YENİ AÇILAN satır sayısı. Sabit `0`
  // basmak, `compute`ın ASIL İŞİNİ görünmez kılar.
  expect(first.created, "ilk hesap satırları ÜRETİR ve sayar").toBeGreaterThan(0);
  expect(first.updated, "ilk hesapta güncellenecek satır YOKTUR").toBe(0);
  expect(first.skipped_overridden).toBe(0);
  expect(first.skipped_approved).toBe(0);
  // Sözleşmenin BEŞİNCİ alanı (K4): 2025-01 yılın İLK ayıdır ⇒ eksik önceki
  // dönem yoktur. Alanın VARLIĞI da iddianın parçasıdır — eksikse ekran
  // kümülatif matrah uyarısını hiç basamaz.
  expect(typeof first.missing_prior_period_count, "K4 alanı sözleşmede ZORUNLU").toBe(
    "number",
  );
  expect(first.missing_prior_period_count).toBe(0);

  // Hesap sonrası dönem GERÇEKTEN doldu ve sayı `created` ile birebir tutar.
  const afterCompute = await getDetail(page, created.id);
  expect(allLines(afterCompute).length).toBe(first.created);
  expect(afterCompute.summary.line_count).toBe(first.created);

  // T6 · hesaplanan dönem KENDİLİĞİNDEN onaya düşer (ödenebilir satır çıktı).
  expect(afterCompute.status, "hesap sonrası dönem onay bekler").toBe("pending_approval");

  // İKİNCİ hesap: aynı satırlar yeniden ÜRETİLMEZ, GÜNCELLENİR.
  const second = await compute(page, created.id);
  expect(second.created, "ikinci hesap yeni satır AÇMAZ").toBe(0);
  expect(second.updated, "ikinci hesap mevcut satırları günceller").toBeGreaterThan(0);
  const afterSecond = await getDetail(page, created.id);
  expect(allLines(afterSecond).length, "satır sayısı ikiye KATLANMAZ").toBe(first.created);
});

/* ── 2) K4 · eksik önceki dönem sayacı GERÇEKTEN sayar ───────────────────── */

test("compute eksik onceki donemleri sayar (K4)", async ({ page }) => {
  await loginForPayroll(page);

  // Mart 2025: aynı yılda ÖNCE gelen iki ay (Ocak · Şubat) vardır. Ocak başka
  // bir testin adasıdır ve `fullyParallel` altında AÇILMIŞ ya da AÇILMAMIŞ
  // olabilir ⇒ iddia bir ARALIKTIR, sabit sayı DEĞİL. Sabit yazılsaydı kapı
  // koşu sırasına bağlı olur (FLAKY) ve sahte-kırmızı üretirdi.
  const created = await createPeriod(page, { year: 2025, month: 3 });
  const result = await compute(page, created.id);

  expect(result.created).toBeGreaterThan(0);
  // Şubat 2025 hiçbir testin adası değildir ⇒ HER ZAMAN eksiktir.
  expect(result.missing_prior_period_count, "en az Şubat eksik").toBeGreaterThanOrEqual(1);
  expect(result.missing_prior_period_count, "en fazla Ocak+Şubat").toBeLessThanOrEqual(2);
});

/* ── 3) Sözleşme kapıları · 409 · 422 ────────────────────────────────────── */

test("acilmis ay 409, gecersiz ay 422, kilitli donem 409 doner", async ({ page }) => {
  await loginForPayroll(page);

  // Aynı ayı ikinci kez açmak 409'dur (UQ `(year, month)`).
  const first = await createPeriod(page, { year: 2025, month: 2 });
  const duplicate = await page.request.post("/api/backend/payroll/periods", {
    data: { year: 2025, month: 2 },
  });
  expect(duplicate.status(), "açılmış ay 409").toBe(409);

  // Geçersiz ay 422 (şema `ge=1, le=12`).
  const badMonth = await page.request.post("/api/backend/payroll/periods", {
    data: { year: 2025, month: 13 },
  });
  expect(badMonth.status(), "13. ay 422").toBe(422);

  // 🔴 `compute` KİLİTLİ dönemde 409'dur (`approved`/`paid`). Ekranın
  // düğmesini kapatan kural budur; 2026-06 fikstürü `approved`tır ve BU TEST
  // ONU OYNATMAZ — 409 yanıtı dönemin durumuna DOKUNMAZ (salt kapı ölçümü).
  const locked = await page.request.post(
    "/api/backend/payroll/periods/pp-2026-06/compute",
  );
  expect(locked.status(), "approved dönem yeniden hesaplanamaz").toBe(409);

  // Açılan dönem hâlâ hesaplanabilir durumdadır (kapı yalnız kilitliye kapalı).
  const ok = await compute(page, first.id);
  expect(ok.created).toBeGreaterThan(0);
});

/* ── 4) 🔴 SAHTE-YEŞİLİN YEDİNCİ HÂLİ · mock sorgu kısıtlarını DOĞRULAR ───── */

/**
 * 🔴 Bu test canlıdaki kusurun **kaçtığı deliği** kapatır.
 *
 * `PAYROLL_PERIODS_LIMIT` elle `240` yazılmıştı; sözleşme tavanı **200**dür ve
 * backend aşımı *sessizce KIRPMAZ, 422 döner*. Kullanıcı birebir şunu gördü:
 * `Input should be less than or equal to 200`. Buna rağmen 6173 birim testi,
 * dört e2e ve dört kapı da **yeşil** geçti — çünkü **sahte backend `limit`i
 * DOĞRULAMIYOR, KIRPIYORDU** ve kendi tavanını da `240` yazmıştı: sahte
 * backend, frontend'in HATASINI taklit ediyordu.
 *
 * Bir sahte backend'in sözleşmeden SAPMASI, o sapmanın canlıda kusur olarak
 * yaşamasına izin verir. Kısıtlar bu yüzden `openapi.json`dan OKUNUR.
 */
test("mock sorgu kisitlarini sozlesmeden okur ve ihlalde 422 doner", async ({ page }) => {
  await loginForPayroll(page);

  // Tavan AŞIMI 422'dir — kırpılıp 200 dönmez.
  const over = await page.request.get("/api/backend/payroll/periods?limit=201");
  expect(over.status(), "limit=201 ⇒ 422").toBe(422);
  // Mesaj FastAPI'nin ürettiğiyle aynı olmalı: kullanıcı bunu gördü.
  expect(JSON.stringify(await over.json())).toContain(
    "Input should be less than or equal to 200",
  );

  // Sınırın KENDİSİ geçerlidir (`le`, `lt` değil) — frontend tam burada durur.
  const atCeiling = await page.request.get("/api/backend/payroll/periods?limit=200");
  expect(atCeiling.status(), "limit=200 ⇒ 200").toBe(200);

  // Taban ihlalleri de 422'dir (`ge=1` / `ge=0`).
  expect((await page.request.get("/api/backend/payroll/periods?limit=0")).status()).toBe(422);
  expect((await page.request.get("/api/backend/payroll/periods?offset=-1")).status()).toBe(
    422,
  );

  // Parametresiz çağrı sunucunun varsayılanını kullanır (50) — kısıt YOK demek
  // değil, "gönderilmedi" demektir.
  expect((await page.request.get("/api/backend/payroll/periods")).status()).toBe(200);
});

/* ── 5) 🔴 F-BORDONEM · GÖVDE kısıtları da sözleşmeden ölçülür ────────────── */

/**
 * 🔴 **SÖZLEŞME KISITI TİPTE YAŞAMAZ** — `PayrollPeriodCreate.year` `number`
 * diye üretilir, `2000-2100` tipte İFADE EDİLEMEZ. Bu yüzden korkuluk (a)
 * formda, (b) sahte backend'de ve (c) `payroll-period-contract.test.ts`te
 * sözleşmeye çakılı olarak yaşar.
 *
 * Bu test (b)'yi ölçer: sahte backend 1999'u kabul ediyorsa, formun
 * korkuluğunu kaldıran bir mutasyon HİÇBİR testi kırmaz ve kusur canlıya
 * gider — sahte backend o hâlde ONAYLAYICIDIR, bekçi değil. (`limit=240`
 * kusurunun tıpatıp aynısı.)
 */
test("gecersiz YIL govdesi 422 doner ve mesaj FastAPI'ninkiyle AYNIDIR", async ({
  page,
}) => {
  await loginForPayroll(page);

  const tooEarly = await page.request.post("/api/backend/payroll/periods", {
    data: { year: 1999, month: 1 },
  });
  expect(tooEarly.status(), "1999 ⇒ 422").toBe(422);
  expect(JSON.stringify(await tooEarly.json())).toContain(
    "Input should be greater than or equal to 2000",
  );

  const tooLate = await page.request.post("/api/backend/payroll/periods", {
    data: { year: 2101, month: 1 },
  });
  expect(tooLate.status(), "2101 ⇒ 422").toBe(422);
  expect(JSON.stringify(await tooLate.json())).toContain(
    "Input should be less than or equal to 2100",
  );

  // 🔴 **NEGATİF KONTROL** — kapı *"her gövdeye 422 diyor"* olmamalı.
  //
  // ⚠️ Sınır DEĞERİNİN (2000/2100) kabul edildiği BURADA ölçülmez ve bu
  // bilinçlidir: `payrollState` modül düzeyindedir, yani 201 dönen bir
  // istek 2000 ve 2100 yıllarını **kalıcı** olarak listeye sokar ve
  // `bordro-gecmis` karesinin yıl seçicisine iki seçenek daha ekleyerek
  // BAŞKA bir dilimin baseline'ını kırardı (FAZLA FİKSTÜR kanonu). Sınır
  // değeri `payroll-period-contract.test.ts`te — şemadan okunan `minimum`/
  // `maximum` ile — çakılıdır (`ge`/`le`, `gt`/`lt` değil).
  //
  // Buradaki kanıt: geçerli bir yıl gövde kapısından GEÇER ve reddi başka
  // bir sebeple (409, açılmış ay) alır.
  const validYear = await page.request.post("/api/backend/payroll/periods", {
    data: { year: 2026, month: 7 },
  });
  expect(validYear.status(), "geçerli yıl gövde kapısını geçer ⇒ 409").toBe(409);

  // Ay sınırı da AYNI kapıdan geçer (elle yazılmış `1..12` değil, şemadan).
  const badMonth = await page.request.post("/api/backend/payroll/periods", {
    data: { year: 2026, month: 0 },
  });
  expect(badMonth.status(), "0. ay ⇒ 422").toBe(422);
  expect(JSON.stringify(await badMonth.json())).toContain(
    "Input should be greater than or equal to 1",
  );
});
