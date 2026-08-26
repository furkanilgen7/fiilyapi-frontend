import { test, expect, type Page } from "@playwright/test";

/**
 * TB-IKIZ · POZİTİF KONTROL — test ikizinin ENUM kapıları GERÇEKTEN reddediyor mu?
 *
 * 🔴 NEDEN VAR. Bu dilimden önce dört yazma ucu (`section_type` · günlük
 * `weather` (POST ve PATCH) · plan hücresi `tag`) gövdedeki enum alanını HİÇ
 * denetlemiyordu: `String(body.section_type)` / `body.weather as string | null`
 * yazıyor, yani gerçek backend'in **422 vereceği** her metni 200/201 ile kabul
 * ediyorlardı. Böyle bir ikiz bir ONAYLAYICIDIR, bekçi değil — istemcideki
 * seçenek listesini silen bir mutasyon e2e'de HİÇBİR ŞEY kırmazdı (K-MKD2).
 *
 * 🔴 NEDEN AYRI DOSYA VE NEDEN "POZİTİF KONTROL". Bir kapının VAR olduğunu
 * geçen testler söylemez: kapı sessizce kaldırılsa da hepsi yeşil kalır. Kapıyı
 * ölçen tek şey, kapıya ÇARPAN bir istektir. Buradaki her iddia sözleşme DIŞI
 * bir değer gönderir ve 422 bekler.
 *
 * 🔒 FİKSTÜR İZOLASYONU YAPISALDIR: reddedilen bir yazma hiçbir kaydı
 * oynatmaz. Dört uç da ihlali durum değişikliğinden ÖNCE döndürür, bu yüzden
 * bu dosya hiçbir görsel kadrajı kaydıramaz. (`plan/cells` ucu haftayı
 * değiştirmeden önce hücre hücre denetler — 422 dönerse `state.planCells`e
 * HİÇ dokunulmaz.)
 */
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** FastAPI'nin enum mesajı ikizde birebir üretilir — metni de doğrula. */
async function expectEnum422(response: import("@playwright/test").APIResponse, field: string) {
  expect(response.status(), `sözleşme dışı enum 422 dönmeli: ${await response.text()}`).toBe(422);
  const body = JSON.stringify(await response.json());
  expect(body, "hata gövdesi FastAPI biçiminde ve DOĞRU alanı işaret etmeli").toContain(
    `"loc":["body","${field}"]`,
  );
  expect(body).toContain("Input should be");
}

test("bolum yazma uclari sozlesme disi `section_type` degerini REDDEDER", async ({ page }) => {
  await login(page);

  const created = await page.request.post("/api/backend/sites/s-2/sections", {
    data: { name: "Enum kapisi POST", section_type: "kafama-gore-tip", is_draft: true },
  });
  await expectEnum422(created, "section_type");

  const patched = await page.request.patch("/api/backend/sections/sec-1", {
    data: { section_type: "kafama-gore-tip" },
  });
  await expectEnum422(patched, "section_type");

  // 🔴 KARŞIT KANIT — kapı her şeyi reddeden bir DUVAR değil. Bu olmasaydı uç
  // her gövdeye 422 verse bile test yeşil kalır ve HİÇBİR ŞEY ölçmezdi.
  // Sözleşmedeki üye (`structural`) enum kapısını GEÇER ve istek DAHA SONRAKİ
  // bir kurala (tarih tutarlılığı) takılır: hata mesajının DEĞİŞMESİ, kapının
  // seçici olduğunun kanıtıdır. Gövde reddedildiği için sec-1 OYNAMAZ.
  const validEnum = await page.request.patch("/api/backend/sections/sec-1", {
    data: { section_type: "structural", start_date: "2026-05-01", end_date: "2026-01-01" },
  });
  expect(validEnum.status()).toBe(422);
  expect(
    JSON.stringify(await validEnum.json()),
    "sözleşmedeki üye enum kapısını GEÇMELİ — hata artık BAŞKA bir kuraldan gelir",
  ).toContain("Planlanan bitiş tarihi başlangıçtan önce olamaz.");
});

test("gunluk yazma uclari sozlesme disi `weather` degerini REDDEDER", async ({ page }) => {
  await login(page);

  const created = await page.request.post("/api/backend/sites/s-2/diary", {
    data: { entry_date: "2031-01-01", weather: "tipi-var" },
  });
  await expectEnum422(created, "weather");

  // d-2 TASLAKTIR (d-1 `submitted` — düzenleme 409 verir ve enum kapısına HİÇ
  // ulaşılmazdı; kapı ölçülmemiş olurdu).
  const patched = await page.request.patch("/api/backend/diary/d-2", {
    data: { weather: "tipi-var" },
  });
  await expectEnum422(patched, "weather");
});

test("plan hucresi sozlesme disi `tag` degerini REDDEDER", async ({ page }) => {
  await login(page);

  const saved = await page.request.put("/api/backend/sites/s-2/plan/cells?week_start=2026-08-24", {
    data: { cells: [{ row_id: "pr-1", plan_date: "2026-08-24", text: "x", tag: "turuncu" }] },
  });
  await expectEnum422(saved, "tag");
});
