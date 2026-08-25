import { test, expect } from "@playwright/test";

import { VISUAL_YEAR, WRITE_YEAR, login } from "./bordro-oranlari-helpers";

// F-BORORAN · YAZMA uçlarının ALTYAPI e2e'si (ekran DEĞİL).
//
// Neden UI'sız: `PUT /payroll/rates/{year}/{source}` ve
// `PUT /payroll/tax-brackets/{year}/{income_kind}` PAYLAŞILAN mock durumunu
// değiştirir; ekrandan tıklanan bir "Kaydet", aynı sunucuya bakan
// `bordro-oranlari-visual.spec.ts` karesini `fullyParallel` altında SESSİZCE
// oynatırdı (F-UNIT2 dersi). Bu yüzden yazma YALNIZ `WRITE_YEAR`e (2023)
// yapılır: o yıl hiçbir kadraja girmez ve seçenek listesinde ZATEN vardır.
//
// 🔴 BFF KÖKÜ: `payroll` kökü `ALLOWED_ROOTS`ta VARDIR (route.ts:159) ama
// bugüne kadar bu ekrandan ÇAĞRILMIYORDU. Bu dosya PUT metodunun da o kökten
// geçtiğini kanıtlar — GET'in geçmesi PUT hakkında hiçbir şey söylemez.
//
// 🔴 KONTROL SORUSU (WORKFLOW §4): *"bu mock, gerçek backend'in REDDEDECEĞİ
// bir isteği reddediyor mu?"* — aşağıdaki 409/422 testleri bunun kanıtıdır.
// Reddetmeyen bir mock ONAYLAYICIDIR, bekçi değil.

const RATE_BODY = {
  sgk_employee_pct: "14.000",
  unemployment_employee_pct: "1.000",
  income_tax_pct: null,
  stamp_tax_pct: "0.759",
  sgk_employer_pct: "20.500",
  unemployment_employer_pct: "2.000",
  short_work_pct: "0.000",
  is_active: true,
};

test("oran seti TAM SET olarak yazilir ve geri okunur", async ({ page }) => {
  await login(page);
  const put = await page.request.put(`/api/backend/payroll/rates/${WRITE_YEAR}/intern`, {
    data: { ...RATE_BODY, sgk_employee_pct: "13.500" },
  });
  expect(put.status()).toBe(200);
  expect(await put.json()).toMatchObject({
    year: WRITE_YEAR,
    personnel_source: "intern",
    sgk_employee_pct: "13.500",
    income_tax_pct: null,
  });
});

test("EKSIK oran alani 422 alir — kismi yama YOKTUR", async ({ page }) => {
  await login(page);
  const { short_work_pct, ...eksik } = RATE_BODY;
  void short_work_pct;
  const res = await page.request.put(`/api/backend/payroll/rates/${WRITE_YEAR}/intern`, {
    data: eksik,
  });
  expect(res.status()).toBe(422);
});

test("ONAYLI donemi olan yila oran yazmak 409 alir (para korkulugu)", async ({ page }) => {
  await login(page);
  const res = await page.request.put(`/api/backend/payroll/rates/${VISUAL_YEAR}/intern`, {
    data: RATE_BODY,
  });
  expect(res.status()).toBe(409);
});

test("tarife TAM KUME yazilir: govdede olmayan dilim SILINIR", async ({ page }) => {
  await login(page);
  const uc = await page.request.put(
    `/api/backend/payroll/tax-brackets/${WRITE_YEAR}/wage`,
    {
      data: {
        brackets: [
          { ordinal: 1, upper_bound: "100000.00", rate_pct: "15.000" },
          { ordinal: 2, upper_bound: "500000.00", rate_pct: "27.000" },
          { ordinal: 3, upper_bound: null, rate_pct: "40.000" },
        ],
        is_active: true,
      },
    },
  );
  expect(uc.status()).toBe(200);
  expect((await uc.json()).total).toBe(3);

  // İKİ dilimlik set gönderilince ÜÇÜNCÜSÜ sunucudan SİLİNİR.
  const iki = await page.request.put(
    `/api/backend/payroll/tax-brackets/${WRITE_YEAR}/wage`,
    {
      data: {
        brackets: [
          { ordinal: 1, upper_bound: "70000.00", rate_pct: "15.000" },
          { ordinal: 2, upper_bound: null, rate_pct: "27.000" },
        ],
      },
    },
  );
  expect(iki.status()).toBe(200);
  const okuma = await page.request.get(
    `/api/backend/payroll/tax-brackets?year=${WRITE_YEAR}&income_kind=wage`,
  );
  expect((await okuma.json()).total).toBe(2);
});

test("SINIRLI son dilim 422 alir — ustundeki matrah vergisiz kalirdi", async ({ page }) => {
  await login(page);
  const res = await page.request.put(
    `/api/backend/payroll/tax-brackets/${WRITE_YEAR}/wage`,
    {
      data: {
        brackets: [
          { ordinal: 1, upper_bound: "70000.00", rate_pct: "15.000" },
          { ordinal: 2, upper_bound: "200000.00", rate_pct: "27.000" },
        ],
      },
    },
  );
  expect(res.status()).toBe(422);
});

test("ORTADA sinirsiz dilim 422 alir — sonraki dilimler erisilemez olurdu", async ({ page }) => {
  await login(page);
  const res = await page.request.put(
    `/api/backend/payroll/tax-brackets/${WRITE_YEAR}/wage`,
    {
      data: {
        brackets: [
          { ordinal: 1, upper_bound: null, rate_pct: "15.000" },
          { ordinal: 2, upper_bound: null, rate_pct: "27.000" },
        ],
      },
    },
  );
  expect(res.status()).toBe(422);
});

test("AZALAN ust sinir 422 alir — ayni matrah iki dilime duserdi", async ({ page }) => {
  await login(page);
  const res = await page.request.put(
    `/api/backend/payroll/tax-brackets/${WRITE_YEAR}/wage`,
    {
      data: {
        brackets: [
          { ordinal: 1, upper_bound: "200000.00", rate_pct: "15.000" },
          { ordinal: 2, upper_bound: "70000.00", rate_pct: "20.000" },
          { ordinal: 3, upper_bound: null, rate_pct: "27.000" },
        ],
      },
    },
  );
  expect(res.status()).toBe(422);
});

test("BOS dilim seti 422 alir (`minItems: 1`)", async ({ page }) => {
  await login(page);
  const res = await page.request.put(
    `/api/backend/payroll/tax-brackets/${WRITE_YEAR}/wage`,
    { data: { brackets: [] } },
  );
  expect(res.status()).toBe(422);
});

test("ONAYLI donemi olan yila tarife yazmak 409 alir", async ({ page }) => {
  await login(page);
  const res = await page.request.put(
    `/api/backend/payroll/tax-brackets/${VISUAL_YEAR}/wage`,
    {
      data: { brackets: [{ ordinal: 1, upper_bound: null, rate_pct: "15.000" }] },
    },
  );
  expect(res.status()).toBe(409);
});
