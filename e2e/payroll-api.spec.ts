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
