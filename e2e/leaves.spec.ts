import { test, expect, type Page } from "@playwright/test";

// F-IZN T6 · `/personel/izinler` (İzin Yönetimi) — FONKSİYONEL e2e (görsel
// DEĞİL; görsel spec T7'nindir, bu yüzden hiçbir başlıkta "gorsel" GEÇMEZ).
//
// Kanıtlanan zincir: üç BFF kökü telden geçer → sekmeden gezinme gerçek ekranı
// açar → iki uç tabloları doldurur → K4/K5/K9 hücreleri sunucudan gelir → hak
// aşımında onay PASİF / red AKTİF → sınır gününde onay SERBEST → red gerekçesi
// `trim()` kapısından geçer → karar sonrası liste TAZELENİR.
//
// 🔒 FİKSTÜR İZOLASYONU (mock-backend `LEAVE_REQUEST_SEEDS` notu): `lv-1…lv-5`
// OKUMA adasıdır ve bu dosya onları KARARA BAĞLAMAZ. Yazma akışları yalnız
// `lv-w1` (onay) ve `lv-w2` (red) üzerinde koşar; yeni talepler `lv-new-*`
// doğar. Üçü de T7'nin `pinLeaveRequests` süzgecinin DIŞINDADIR.
//
// ⚠️ `fullyParallel` altında bu dosyanın testleri de birbirine paralel koşar:
// her yazma akışı KENDİ kaydına sahiptir, iki test aynı kaydı yarıştıramaz.
//
// ⚠️ `getByRole("alert")` bu depoda YASAKTIR.

const LEAVES_URL = "/personel/izinler";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

async function openLeaves(page: Page) {
  await login(page);
  await page.goto(LEAVES_URL);
  await expect(page.getByRole("heading", { level: 1, name: "İzin Yönetimi" })).toBeVisible();
}

/* ── K1 · BFF kökleri TELDEN ─────────────────────────────────────────────── */

test("leave-types · leave-requests · leave-balances kökleri BFF'ten geçer", async ({ page }) => {
  await login(page);

  // 🔴 Eksik kök YALNIZ CANLIDA 404 verir ve jsdom bunu GÖRMEZ — bu turun
  // amacı tam olarak o kör noktayı kapatmaktır.
  const types = await page.request.get("/api/backend/leave-types");
  expect(types.status()).toBe(200);
  const typeRows = (await types.json()) as Array<{
    name: string;
    sort_order: number;
    requires_document: boolean;
    color: string | null;
  }>;
  expect(typeRows.length).toBeGreaterThan(0);
  // `sort_order` SUNUCU sırasıdır (istemci ayrıca sıralar ama uydurmaz).
  const orders = typeRows.map((row) => row.sort_order);
  expect(orders).toEqual([...orders].sort((a, b) => a - b));
  // Formun KOŞULLU BELGE dalı ancak böyle bir tip varsa ölçülebilir.
  expect(typeRows.some((row) => row.requires_document)).toBe(true);
  // Rozet rengi SUNUCUDAN gelir — kodda çıplak hex durmaz.
  expect(typeRows.every((row) => row.color !== null)).toBe(true);

  const requests = await page.request.get("/api/backend/leave-requests?status=pending");
  expect(requests.status()).toBe(200);

  const balance = await page.request.get(`/api/backend/leave-balances/per-1/2026`);
  expect(balance.status()).toBe(200);
  expect((await balance.json()) as { personnel_id: string }).toMatchObject({
    personnel_id: "per-1",
  });

  // Özet ucu MEVCUT "hr" kökünden geçer (ayrı kök gerekmez).
  const summary = await page.request.get("/api/backend/hr/leaves/summary?year=2026");
  expect(summary.status()).toBe(200);
});

test("liste zarfının `total`ı SAYFADAN BAĞIMSIZDIR (K5'in ayrışma noktası)", async ({ page }) => {
  await login(page);

  const full = await page.request.get("/api/backend/leave-requests?status=pending&limit=200");
  const fullBody = (await full.json()) as { items: unknown[]; total: number };
  expect(fullBody.total).toBe(fullBody.items.length);

  // 🔴 Pencere daraltılınca `total` DEĞİŞMEZ, `items.length` DÜŞER: başlıktaki
  // sayı satır sayısı DEĞİLDİR. (Ekranın kendi isteği limit göndermez ve
  // sunucunun varsayılanı 50'dir — ekran düzeyinde ayrışma ancak 50'den fazla
  // bekleyen talep varken doğar; bu yüzden kanıt UÇ düzeyinde alınır.)
  const paged = await page.request.get("/api/backend/leave-requests?status=pending&limit=2");
  const pagedBody = (await paged.json()) as { items: unknown[]; total: number };
  expect(pagedBody.items.length).toBe(2);
  expect(pagedBody.total).toBe(fullBody.total);
  expect(pagedBody.total).toBeGreaterThan(pagedBody.items.length);

  // Tavanı aşan istek SESSİZCE KIRPILMAZ.
  expect((await page.request.get("/api/backend/leave-requests?limit=500")).status()).toBe(422);
});

/* ── Ekran ───────────────────────────────────────────────────────────────── */

test("sekme şeridinden İzin Yönetimi ekranı açılır; KPI şeridi sunucudan gelir", async ({
  page,
}) => {
  await login(page);
  await page.goto("/personel");
  await page.getByRole("tab", { name: "İzin Yönetimi" }).first().click();
  await expect(page).toHaveURL(/\/personel\/izinler$/);

  await expect(page.getByTestId("iz-kpi-pending")).toHaveText("7");
  await expect(page.getByTestId("iz-kpi-on-leave")).toHaveText("3");
  await expect(page.getByTestId("iz-kpi-used")).toHaveText("46 gün");
  // Decimal string ("128.50") tr-TR biçiminde basılır.
  await expect(page.getByTestId("iz-kpi-debt")).toHaveText("128,5 gün");
  await expect(page.getByTestId("iz-kpi-risk")).toHaveText("2 kişi");

  // 🔴 ŞEF KARARI: `unknown_entitlement_personnel` (fikstürde 1) BASILMAZ —
  // mockup'ta karşılığı olan kart yoktur, KPI İCAT EDİLMEZ.
  await expect(page.getByTestId("iz-kpi-strip")).not.toContainText("Hak Bilinmeyen");
});

test("bekleyen talep tablosu K4/K9 hücrelerini ve belge ekini sunucudan basar", async ({
  page,
}) => {
  await openLeaves(page);

  // Normal satır — kalan 12 gün.
  await expect(page.getByTestId("iz-remaining-lv-1")).toHaveText("12 gün");
  // 🔴 K9 · tip yıllık haktan DÜŞMEZ ⇒ "Düşmez" (0 ya da "—" DEĞİL).
  await expect(page.getByTestId("iz-remaining-lv-4")).toHaveText("Düşmez");
  // 🔴 K4 · bakiye satırı OLMAYAN personel ⇒ "—" (0 DEĞİL).
  await expect(page.getByTestId("iz-remaining-lv-5")).toHaveText("—");
  // Belge ekli satır (İZ 88) — erişilebilir ad SVG'nin tek metnidir.
  await expect(page.getByTestId("iz-attachment-lv-4")).toBeVisible();
  await expect(page.getByTestId("iz-attachment-lv-1")).toHaveCount(0);
  // Hak aşan satır açıklama hücresinde fazlalığı yazar (İZ 98).
  await expect(page.getByTestId("iz-pending-row-lv-2")).toContainText("Hak aşımı — 4 gün fazla");
});

test("hak aşımında onay PASİF / red AKTİF; SINIR GÜNÜNDE onay serbesttir", async ({ page }) => {
  await openLeaves(page);

  // lv-2: kalan 2, talep 6 ⇒ aşım.
  await expect(page.getByTestId("iz-approve-lv-2")).toBeDisabled();
  // 🔴 Red HER ZAMAN serbesttir — aşım reddi ENGELLEMEZ.
  await expect(page.getByTestId("iz-reject-lv-2")).toBeEnabled();

  // 🔴 lv-3: talep 3 === kalan 3. Kapı `>` yerine `>=` olsaydı BU düğme pasif
  // olurdu — pencere sınırı böylece testsiz kalmaz.
  await expect(page.getByTestId("iz-approve-lv-3")).toBeEnabled();
  await expect(page.getByTestId("iz-remaining-lv-3")).toHaveText("3 gün");
});

test("kalan hakkı hesaplanamayan talebin onayında sunucunun 409'u EKRANDA okunur", async ({
  page,
}) => {
  await openLeaves(page);

  // lv-5'in bakiye satırı yoktur: onay kapısı FAIL-CLOSED'dır ve karar
  // sunucunundur (ekran iddiayı ÜRETMEZ, düğme aktiftir).
  await expect(page.getByTestId("iz-approve-lv-5")).toBeEnabled();
  await page.getByTestId("iz-approve-lv-5").click();

  await expect(page.getByTestId("iz-decision-error")).toContainText(
    "Kalan izin hakkı hesaplanamıyor",
  );
  // Talep KARARA BAĞLANMADI — satır yerinde durur.
  await expect(page.getByTestId("iz-pending-row-lv-5")).toBeVisible();
});

test("onay GÖVDESİZ gider ve karar sonrası bekleyen liste tazelenir", async ({ page }) => {
  await openLeaves(page);

  const row = page.getByTestId("iz-pending-row-lv-w1");
  await expect(row).toBeVisible();
  await page.getByTestId("iz-approve-lv-w1").click();

  // Liste + özet birlikte tazelenir: satır artık `pending` değildir.
  await expect(page.getByTestId("iz-pending-row-lv-w1")).toHaveCount(0);
  await expect(page.getByTestId("iz-decision-error")).toHaveCount(0);
});

test("red diyaloğu: boş VE tek boşluk gerekçede düğme pasif; hazır gerekçe alana yazar", async ({
  page,
}) => {
  await openLeaves(page);

  await page.getByTestId("iz-reject-lv-w2").click();
  const reason = page.getByTestId("iz-reject-reason");
  await expect(reason).toBeVisible();

  // Boş gerekçe ⇒ pasif + görünür sebep.
  await expect(page.getByTestId("iz-reject-submit")).toBeDisabled();
  await expect(page.getByTestId("iz-reject-required")).toContainText("Gerekçe zorunlu");

  // 🔴 TEK BOŞLUK: kapı `!== ""` ile kurulsaydı bu adım geçer ve kullanıcı
  // sunucuda 422 yerdi. Kapı `trim()` üzerindedir.
  await reason.fill(" ");
  await expect(page.getByTestId("iz-reject-submit")).toBeDisabled();

  // Hazır gerekçe alana YAZAR (düzenlenebilir kalır).
  await page.getByRole("button", { name: "Belge eksik" }).click();
  await expect(reason).toHaveValue("Belge eksik");
  await expect(page.getByTestId("iz-reject-submit")).toBeEnabled();

  await page.getByTestId("iz-reject-submit").click();

  // Diyalog kapanır ve liste tazelenir.
  await expect(page.getByTestId("iz-reject-reason")).toHaveCount(0);
  await expect(page.getByTestId("iz-pending-row-lv-w2")).toHaveCount(0);
});

test("talep formu: gün TÜRETİLİR, belge zorunlu tip kapıyı kapatır, kayıt listeye düşer", async ({
  page,
}) => {
  await openLeaves(page);

  await page.getByTestId("iz-new-request").click();
  await expect(page.getByTestId("iz-request-submit")).toBeVisible();

  // Alanlar boşken görünür gerekçe basılır (title'da SAKLANMAZ).
  await expect(page.getByTestId("iz-request-block-reason")).toContainText(
    "Personel, izin tipi ve iki tarih zorunludur.",
  );

  await page.getByTestId("iz-request-personnel").selectOption("per-5");
  // Bakiyesi hesaplanamayan personel: "Hak yok" (0 DEĞİL).
  await expect(page.getByTestId("iz-request-remaining")).toContainText("Hak yok");

  // 🔴 KARAR 3 · belge zorunlu tip seçilince kapı KAPANIR.
  await page.getByTestId("iz-request-type").selectOption("lt-2");
  await page.getByTestId("iz-request-start").fill("2026-11-02");
  await page.getByTestId("iz-request-end").fill("2026-11-06");
  // 🔴 KARAR 1 · gün TÜRETİLİR (iki uç DAHİL: 2–6 Kasım = 5).
  await expect(page.getByTestId("iz-request-days")).toHaveValue("5");
  await expect(page.getByTestId("iz-request-block-reason")).toContainText(
    "Seçilen izin tipi için belge eki zorunludur.",
  );
  await expect(page.getByTestId("iz-request-submit")).toBeDisabled();

  // Belge istemeyen tipe geçilince kapı AÇILIR.
  await page.getByTestId("iz-request-type").selectOption("lt-1");
  await expect(page.getByTestId("iz-request-block-reason")).toHaveCount(0);

  // Ters tarih ekranın KENDİ hatasıdır (sunucuya 422 yedirilmez).
  await page.getByTestId("iz-request-end").fill("2026-11-01");
  await expect(page.getByTestId("iz-request-block-reason")).toContainText(
    "Bitiş tarihi başlangıçtan önce olamaz.",
  );
  await page.getByTestId("iz-request-end").fill("2026-11-06");

  await page.getByTestId("iz-request-note").fill("E2E talep akışı");
  await page.getByTestId("iz-request-submit").click();

  // Diyalog kapanır ve YENİ talep bekleyen listeye düşer (liste tazelendi).
  await expect(page.getByTestId("iz-request-submit")).toHaveCount(0);
  await expect(page.getByTestId("iz-pending-card")).toContainText("E2E talep akışı");
});

test("bakiye tablosunun yıl seçicisi SUNUCUYA gider (boş yıl boş durum basar)", async ({
  page,
}) => {
  await openLeaves(page);

  // 2026 · beş bakiye satırı; hakkı hesaplanamayan satır "Hak yok" basar.
  await expect(page.getByTestId("iz-balance-row-per-1")).toBeVisible();
  await expect(page.getByTestId("iz-remaining-balance-per-5")).toHaveText("Hak yok");
  // Devreden 0 olan satır "0" basar; hakkı bilinmeyen satır "—" (ikisi AYRI).
  await expect(page.getByTestId("iz-carried-per-1")).toHaveText("0");
  await expect(page.getByTestId("iz-carried-per-2")).toHaveText("6");

  await page.getByTestId("iz-year-select").selectOption("2025");
  await expect(page.getByTestId("iz-balances-empty")).toBeVisible();
  await expect(page.getByTestId("iz-balance-row-per-1")).toHaveCount(0);
});
