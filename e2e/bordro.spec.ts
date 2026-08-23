import { test, expect, type Page } from "@playwright/test";

import { PAYROLL_PERIODS_LIMIT } from "@/lib/api/hooks/usePayroll";

import { loginForPayroll, pinPayrollPeriods, toKurus } from "./payroll-helpers";

/**
 * F-BOR T6 · bordro ekranlarının İŞLEVSEL e2e'si (`bordro-visual.spec.ts`
 * yalnız kadraj basar; iddialar burada yaşar).
 *
 * DÖRT iş:
 *   1. **K4 TUTARLILIK BEKÇİSİ** — sahte backend'in ÜRETTİĞİ her satırda
 *      `brüt − kesinti = net` ve `banka + elden = net`; her dönemde
 *      `maliyet = brüt + işveren SGK`; SGK özetinde parçaların toplamı = toplam.
 *      🔴 Bu bekçi mockup'ın aritmetiğini DEĞİL, fikstürün KENDİ İÇİNDEKİ
 *      tutarlılığını korur: BY/BG/SGK mockup'larının üçü de kendi sayılarıyla
 *      çelişir (BY taşeron satırlarında 200 TL sapma · BG "7 Ay" derken 5 satır ·
 *      SGK işveren toplamı 25.852 tutmuyor) ve o sayılar KOPYALANMADI.
 *   2. **K7 TEK UÇUŞ** — dönem onayı gönderim boyunca kilitlenir; çift tıklama
 *      TEK istek atar.
 *   3. Satır içi banka/elden bölüşümünün DOĞRULAMASI (sunucu farkı kapatmaz).
 *   4. SGK damgasının tek-uçuşu + ikinci damganın 409'u.
 *
 * 🔒 MUTASYON YILI AYRI. Yazma testleri YALNIZ 2025 dönemlerinde çalışır ve her
 * test KENDİ ayına dokunur; kadrajların yılı (2026) ve oransız yıl (2024) bu
 * dosyadan HİÇ etkilenmez. `fullyParallel` altında aynı dosyanın testleri
 * başka worker'larda eşzamanlı koşabildiği için ay ayrımı zorunludur.
 *
 * ⚠️ Sabit `waitForTimeout` YOKTUR; beklemelerin hepsi durum tabanlıdır.
 * ⚠️ `getByRole("alert")` bu depoda YASAKTIR.
 */

interface ApiLine {
  id: string;
  personnel_source: string;
  status: string;
  gross_amount: string | null;
  deduction_amount: string | null;
  net_amount: string | null;
  bank_amount: string | null;
  cash_amount: string | null;
}

interface ApiSummary {
  net_total: string;
  bank_total: string;
  cash_total: string;
  gross_total: string;
  sgk_employer_total: string;
  total_employer_cost: string;
}

interface ApiDetail {
  id: string;
  year: number;
  month: number;
  summary: ApiSummary;
  sections: { personnel_source: string; line_count: number; lines: ApiLine[] }[];
}

interface ApiSgkSummary {
  sgk_employee_total: string;
  unemployment_employee_total: string;
  income_tax_total: string;
  stamp_tax_total: string;
  employee_deduction_total: string;
  sgk_employer_total: string;
  unemployment_employer_total: string;
  short_work_total: string;
  employer_burden_total: string;
  sgk_premium_total: string;
  unemployment_total: string;
  sgk_payable_total: string;
}

async function getJson<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(path);
  expect(response.status(), `${path} 200 dönmeli`).toBe(200);
  return (await response.json()) as T;
}

/* ── 1) K4 · fikstür tutarlılık bekçisi ──────────────────────────────────── */

test("bordro fikstürleri kendi içinde tutarlıdır (K4 bekçisi)", async ({ page }) => {
  await loginForPayroll(page);

  const list = await getJson<{ items: { id: string }[]; total: number }>(
    page,
    // 🔴 Limit ELLE YAZILMAZ. Burası `240` yazıyordu — sözleşme tavanı 200'dür
    // ve gerçek backend aşımda 422 döner; test, canlıda ölü olan bir çağrıyı
    // "çalışıyor" diye bekçiliyordu (sahte backend kırpıyordu). Değer artık
    // ekranın KULLANDIĞI sabitten gelir; o sabit de `query-limits.contract`
    // bekçisiyle `openapi.json`a bağlıdır.
    `/api/backend/payroll/periods?limit=${PAYROLL_PERIODS_LIMIT}`,
  );
  // Kırpılma yok: bekçi TÜM dönemleri gördü (aksi hâlde sessizce bir alt kümeyi
  // doğrulayıp "hepsi tutarlı" derdi).
  expect(list.items.length).toBe(list.total);
  expect(list.items.length).toBeGreaterThan(0);

  for (const row of list.items) {
    const detail = await getJson<ApiDetail>(page, `/api/backend/payroll/periods/${row.id}`);
    const label = `${detail.year}-${String(detail.month).padStart(2, "0")}`;

    let payableNet = 0;
    let bankSum = 0;
    let cashSum = 0;
    let grossSum = 0;

    for (const section of detail.sections) {
      expect(section.lines.length, `${label} · ${section.personnel_source} line_count`).toBe(
        section.line_count,
      );

      for (const line of section.lines) {
        if (line.gross_amount === null) {
          // Hesaplanamayan satırda para alanlarının HEPSİ `null`dur — `0`
          // DEĞİL. "0 ödenecek" ile "hesaplanamadı" ayrımı şemanın kararıdır.
          expect(line.deduction_amount, `${label} · ${line.id}`).toBeNull();
          expect(line.net_amount, `${label} · ${line.id}`).toBeNull();
          // 🔴 ÖLÇÜLDÜ: `excluded` KAYNAĞA bağlıdır, tutara DEĞİL. Taşeron
          // satırı brütü hesaplanamamış olsa bile `uncomputed`a DÜŞMEZ —
          // düşseydi "ödemeye girmiyor" bilgisi kaybolur ve satır, ücreti
          // eksik bir şirket çalışanıyla aynı kefeye konurdu.
          expect(["uncomputed", "excluded"], `${label} · ${line.id}`).toContain(line.status);
          continue;
        }

        const gross = toKurus(line.gross_amount);
        const deduction = toKurus(line.deduction_amount as string);
        const net = toKurus(line.net_amount as string);
        // 🔴 K4 ÇEKİRDEK İDDİA: brüt − kesinti = net, HER satırda.
        expect(gross - deduction, `${label} · ${line.id} brüt−kesinti=net`).toBe(net);
        grossSum += gross;

        if (line.status === "excluded") {
          // K2 — taşeron satırı ödemeye GİRMEZ: bölüşüm alanları `null`dur ve
          // ödeme tabanına eklenmez. (Maliyet tabanına ise DAHİLDİR.)
          expect(line.bank_amount, `${label} · ${line.id} taşeron banka`).toBeNull();
          expect(line.cash_amount, `${label} · ${line.id} taşeron elden`).toBeNull();
          continue;
        }

        const bank = toKurus(line.bank_amount as string);
        const cash = toKurus(line.cash_amount as string);
        expect(bank + cash, `${label} · ${line.id} banka+elden=net`).toBe(net);
        payableNet += net;
        bankSum += bank;
        cashSum += cash;
      }
    }

    // Özet kartları satırlarla TUTAR (ekran hiçbir toplamı kendi hesaplamaz).
    expect(toKurus(detail.summary.net_total), `${label} net_total`).toBe(payableNet);
    expect(toKurus(detail.summary.bank_total), `${label} bank_total`).toBe(bankSum);
    expect(toKurus(detail.summary.cash_total), `${label} cash_total`).toBe(cashSum);
    // 🔴 İKİ TABAN AYRI: brüt/maliyet taşeronu DAHİL eder, net ETMEZ.
    expect(toKurus(detail.summary.gross_total), `${label} gross_total`).toBe(grossSum);
    expect(toKurus(detail.summary.total_employer_cost), `${label} maliyet`).toBe(
      toKurus(detail.summary.gross_total) + toKurus(detail.summary.sgk_employer_total),
    );

    const sgk = await getJson<ApiSgkSummary>(
      page,
      `/api/backend/payroll/periods/${row.id}/sgk-summary`,
    );
    // SGK:69-74 — ekranda basılan DÖRT işçi kalemi toplamla birebir tutar.
    expect(toKurus(sgk.employee_deduction_total), `${label} işçi toplamı`).toBe(
      toKurus(sgk.sgk_employee_total) +
        toKurus(sgk.unemployment_employee_total) +
        toKurus(sgk.income_tax_total) +
        toKurus(sgk.stamp_tax_total),
    );
    // 🔴🔴 K2 — kısa çalışma payı SIFIRDIR (IK3-SEED kararı). Bu yüzden
    // ekranda çizilen İKİ işveren satırının toplamı, basılan
    // `employer_burden_total` ile BİREBİR eşittir: istemcinin sunucunun
    // sayısını "düzeltmesine" gerek kalmaz.
    expect(toKurus(sgk.short_work_total), `${label} kısa çalışma`).toBe(0);
    expect(toKurus(sgk.employer_burden_total), `${label} işveren toplamı`).toBe(
      toKurus(sgk.sgk_employer_total) + toKurus(sgk.unemployment_employer_total),
    );
    expect(toKurus(sgk.sgk_payable_total), `${label} ödenecek prim`).toBe(
      toKurus(sgk.sgk_premium_total) + toKurus(sgk.unemployment_total),
    );
  }
});

/* ── 2) K7 · dönem onayı TEK UÇUŞ ────────────────────────────────────────── */

test("tumunu onayla cift tiklamada TEK istek atar (K7)", async ({ page }) => {
  // MUTASYON ADASI: yalnız 2025-12 (taslak). Kadrajların yılı görülmez.
  await pinPayrollPeriods(page, (row) => row.year === 2025 && row.month === 12);

  let approveRequests = 0;
  let releaseApprove: () => void = () => {};
  // 🔴 Uçuş penceresi DURUMLA açılır, sabit beklemeyle DEĞİL: istek kapıda
  // tutulur, düğmenin kilitlendiği DOĞRULANIR, ikinci tıklama denenir ve
  // ancak sonra kapı açılır. `waitForTimeout` yok.
  const approveGate = new Promise<void>((resolve) => {
    releaseApprove = resolve;
  });
  await page.route(
    (url) => /\/api\/backend\/payroll\/periods\/[^/]+\/approve$/.test(url.pathname),
    async (route) => {
      approveRequests += 1;
      await approveGate;
      await route.continue();
    },
  );

  await loginForPayroll(page);
  await page.goto("/bordro");

  await expect(page.getByTestId("bordro-loaded")).toBeAttached();
  await expect(page.getByTestId("bordro-period-label")).toHaveText("Aralık 2025");

  const approveAll = page.getByTestId("bordro-approve-all");
  await expect(approveAll).toBeEnabled();
  await approveAll.click();

  // Gönderim boyunca KİLİTLİ (K7). İkinci tıklama zorlansa bile istek doğmaz.
  await expect(approveAll).toBeDisabled();
  await approveAll.click({ force: true });

  releaseApprove();

  await expect(page.getByTestId("bordro-action-result")).toBeVisible();
  await expect(page.getByTestId("bordro-action-error")).toHaveCount(0);
  // 🔴 ÇEKİRDEK İDDİA: iki tıklama, TEK istek.
  expect(approveRequests).toBe(1);

  // Atlama sayaçları GÖRÜNÜR (sessiz atlama yasağı): taşeron ve hesaplanamayan
  // satırlar onaydan düşer ve kullanıcı bunu ekrandan öğrenir.
  await expect(page.getByTestId("bordro-action-result")).toContainText("atlanan");
});

/* ── 3) Satır içi bölüşüm — sunucu farkı KAPATMAZ ────────────────────────── */

test("banka + elden toplami neti tutmazsa satir hatasi basilir", async ({ page }) => {
  await pinPayrollPeriods(page, (row) => row.year === 2025 && row.month === 9);

  await loginForPayroll(page);
  await page.goto("/bordro");
  await expect(page.getByTestId("bordro-loaded")).toBeAttached();
  await expect(page.getByTestId("bordro-period-label")).toHaveText("Eylül 2025");

  const lineId = "pl-2025-09-1"; // per-1 · şirket kadrosu · ödenebilir satır
  const bank = page.getByTestId(`bordro-line-${lineId}-bank`);
  const cash = page.getByTestId(`bordro-line-${lineId}-cash`);
  const netText = await page.getByTestId(`bordro-line-${lineId}-net`).innerText();

  // GEÇERSİZ bölüşüm: iki alan da 1,00 TL — net ne olursa olsun tutmaz.
  await bank.fill("1");
  await cash.fill("1");
  // Kayıt SATIRDAN ÇIKINCA yapılır (iki alan sunucuya birlikte gider).
  await page.getByTestId("bordro-period-label").click();

  await expect(page.getByTestId(`bordro-line-${lineId}-error`)).toContainText(
    "net tutara eşit olmalı",
  );
  // Sunucu farkı KAPATMADI: net hücresi oynamadı.
  await expect(page.getByTestId(`bordro-line-${lineId}-net`)).toHaveText(netText);
});

/* ── 4) SGK damgası — tek uçuş + ikinci damga 409 ─────────────────────────── */

test("sgk damgasi tek ucustur ve ikinci damga reddedilir", async ({ page }) => {
  await pinPayrollPeriods(page, (row) => row.year === 2025 && row.month === 11);

  let submitRequests = 0;
  let releaseSubmit: () => void = () => {};
  const submitGate = new Promise<void>((resolve) => {
    releaseSubmit = resolve;
  });
  await page.route(
    (url) => /\/api\/backend\/payroll\/periods\/[^/]+\/sgk-submit$/.test(url.pathname),
    async (route) => {
      submitRequests += 1;
      await submitGate;
      await route.continue();
    },
  );

  await loginForPayroll(page);
  await page.goto("/bordro/sgk");

  await expect(page.getByTestId("bordro-sgk-loaded")).toBeAttached();
  await expect(page.getByTestId("bordro-sgk-period-label")).toHaveText("Kasım 2025");
  await expect(page.getByTestId("bordro-sgk-status-badge")).toHaveText("Gönderilmedi");

  const submit = page.getByTestId("bordro-sgk-submit");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(submit).toBeDisabled();
  await submit.click({ force: true });
  releaseSubmit();

  // Damga basıldı: rozet döndü ve gönderim düğmesi ekrandan kalktı.
  await expect(page.getByTestId("bordro-sgk-status-badge")).toHaveText("Gönderildi");
  await expect(page.getByTestId("bordro-sgk-submitted-at")).toBeVisible();
  expect(submitRequests).toBe(1);

  // 🔴 Uç İDEMPOTENT DEĞİLDİR: ikinci damga 409'dur. Ekran düğmeyi artık
  // basmadığı için bu ancak uç düzeyinde kanıtlanabilir.
  const periodId = "pp-2025-11";
  const second = await page.request.post(
    `/api/backend/payroll/periods/${periodId}/sgk-submit`,
  );
  expect(second.status()).toBe(409);
});

/* ── 5) 🔴 F-BORDRO · KULLANICI KUSURU: modül boştan kullanılabilir hâle gelir ─ */

/**
 * 🔴 Bu test kullanıcının bildirdiği kusurun TA KENDİSİDİR: canlıda
 * `payroll_periods` tablosuna satır basan bir migration YOKTUR (bilinçli —
 * dönemi kullanıcı açar), dolayısıyla modül BOŞ açılır. Dönem açma ve hesaplama
 * yüzeyleri çizilmemiş olduğu için ekran o boşlukta KİLİTLİ kalıyordu:
 * *"bordro kısmı çalışmıyor"*.
 *
 * Akış BAŞTAN SONA yürütülür: boş ekran → dönem aç → SATIRSIZ dönem → hesapla →
 * satırlar. Uçların üçü de (`POST /payroll/periods` · `.../compute` ·
 * `GET .../{id}`) gerçekten çağrılır.
 *
 * 🔒 MUTASYON ADASI: 2025-05, bu testin TEK sahibi olduğu ay. Süzgeç kadrajı o
 * aya kilitler; başlangıçta o ay YOKTUR ⇒ ekran gerçekten boş durumda açılır.
 */
test("bos bordro modulu donem acilip hesaplanarak kullanilabilir hale gelir", async ({
  page,
}) => {
  await pinPayrollPeriods(page, (row) => row.year === 2025 && row.month === 5);

  await loginForPayroll(page);
  await page.goto("/bordro");
  await expect(page.getByTestId("bordro-loaded")).toBeAttached();

  // 1) BAŞLANGIÇ HÂLİ — hiç dönem yok ve ekran bunu açıkça söylüyor.
  await expect(page.getByTestId("bordro-empty")).toBeVisible();
  await expect(page.getByTestId("bordro-table")).toHaveCount(0);

  // 🔴 ÇIKIŞ YOLU VAR: eski hâlde bu düğme YOKTU ve kullanıcı burada tıkanıyordu.
  const openButton = page.getByTestId("bordro-open-period");
  await expect(openButton).toBeEnabled();
  await openButton.click();

  // 2) DÖNEM AÇ — alanlar uçtan ölçülen şemaya karşılık gelir.
  await page.getByTestId("bordro-open-month").selectOption("5");
  await page.getByTestId("bordro-open-year").fill("2025");
  await page.getByTestId("bordro-open-submit").click();

  // Açılan dönem seçili hâle geldi (ay gezgini oraya atladı).
  await expect(page.getByTestId("bordro-period-label")).toHaveText("Mayıs 2025");
  await expect(page.getByTestId("bordro-empty")).toHaveCount(0);

  // 3) 🔴 AÇILAN DÖNEM SATIRSIZDIR — uç ayı AÇAR, DOLDURMAZ. İkinci duvar
  //    tam burada: eski sahte backend burayı 7 satır dolu döndürdüğü için
  //    harness bu hâli hiç üretemiyordu.
  await expect(page.getByTestId("bordro-loaded")).toBeAttached();
  await expect(page.getByTestId("bordro-line-pl-2025-05-1")).toHaveCount(0);

  // 4) HESAPLA — satırları bu uç üretir.
  const compute = page.getByTestId("bordro-compute");
  await expect(compute).toBeEnabled();
  await compute.click();

  // Sonuç sayıyla raporlanır (sessiz atlama yok) ve satırlar GERÇEKTEN geldi.
  await expect(page.getByTestId("bordro-action-result")).toBeVisible();
  await expect(page.getByTestId("bordro-action-error")).toHaveCount(0);
  await expect(page.getByTestId("bordro-line-pl-2025-05-1")).toBeVisible();
  await expect(page.getByTestId("bordro-table")).toBeVisible();

  // Dönem kendiliğinden onaya düştü (T6) — kullanıcı için sıradaki adım budur.
  await expect(page.getByTestId("bordro-status")).toHaveText("Onay Bekliyor");

  // 5) Aynı ayı ikinci kez açmak ENGELLENİR (409'a gitmeden, formda).
  await openButton.click();
  await page.getByTestId("bordro-open-month").selectOption("5");
  await page.getByTestId("bordro-open-year").fill("2025");
  await expect(page.getByTestId("bordro-open-block-reason")).toContainText(
    "zaten açılmış",
  );
  await expect(page.getByTestId("bordro-open-submit")).toBeDisabled();
});
