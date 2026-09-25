import { expect, type Page, type Response } from "@playwright/test";

import { withEarnedValueLevel } from "./earned-value-helpers";
import { EV_DAY_SCENARIO_DAYS } from "./mock-backend";

// PLN-F2.5b · `Şantiye - Günlük Kayıt (İlerleme)` (İ) görsel kadrajlarının
// YARDIMCILARI — yalnız `site-diary-progress-visual.spec.ts` kullanır.
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; `prepareFrame` BURADAN RE-EXPORT EDİLMEZ
// (`earned-value-helpers.ts` emsali). Kadraj hazırlığı spec'te, doğrudan
// `visual-scroll.ts`ten çağrılır.
//
// Veri kaynağı: `e2e/mock-backend.ts` → "PLN-F2.5a · SAHA (EV GÜN) İKİZİ"
// (`EV_DAY_SCENARIO_DAYS` + `buildEvDiaryScenarioEntries`). s-1 · EKİM 2026.

export const DIARY_PROGRESS_URL = "/projeler/p-1/santiyeler/s-1/gunluk-kayit";

/**
 * Görsel spec'in BAKABİLDİĞİ senaryolar. Yazma hedefleri (`writeTarget` ·
 * `unlockTarget`) tipte YOKTUR: onlar paylaşılan ikizde (fullyParallel) başka
 * spec'lerin mutasyon günleridir, kadraja giremez.
 */
export type DiaryProgressScenario = "full" | "locked" | "blocked" | "noEv";

/** Kadrajların gün kümesi — "Son Kayıtlar" süzgeci de bunu kullanır. */
const VISUAL_DAYS: ReadonlySet<string> = new Set(
  (["full", "locked", "blocked", "noEv"] as const).map((key) => EV_DAY_SCENARIO_DAYS[key]),
);

/** Senaryo kaydının durum rozeti (`DIARY_STATUS_LABELS`): yalnız (b) d-4 gönderilmiş. */
const STATUS_LABEL: Readonly<Record<DiaryProgressScenario, string>> = {
  full: "Taslak",
  locked: "Gönderildi",
  blocked: "Taslak",
  noEv: "Taslak",
};

export const DESKTOP_WIDTH = 1440;
/** Mockup İ:527-558 "(c) Tablet · 1024 px". */
export const TABLET_WIDTH = 1024;
const INITIAL_HEIGHT = 900;

/**
 * 📐 PENCERE İÇERİĞE OTURTULUR (`fitViewportToDiary`).
 *
 * 🔴 NEDEN: Gönder kontrol çubuğu `position: sticky; bottom: 12px`
 * (`diary-progress.css` `.ev-diary-submit`, İ:493). 900px pencerede `fullPage`
 * kadraj yapışkan öğeyi PENCERENİN dibine göre yerleştirir; sayfa ~900px'ten
 * uzun olduğu için çubuk kendi kabının (`.ev-diary-block`) tepesine itilir ve
 * Saat Dağıtımı kartının ÜSTÜNE biner (`PLANNING_SETTINGS_VIEWPORT` /
 * `MAN_HOUR_BUDGET_VIEWPORT` emsali — orada `fixed`, burada `sticky`). Pencere
 * içerikten uzun olunca sayfa hiç kaymaz ve çubuk doğal yerinde durur;
 * açılır yüzeyler (iş kodu seçici) ve tıklamalar da kaydırma üretmez.
 *
 * Sabit bir yükseklik yerine ÖLÇÜLÜR, çünkü içerik yüksekliği Linux/macOS
 * fontlarıyla ~%2 oynar (BÜT: macOS 2800 ↔ Linux 2857,5) ve bu ekran 1440 ile
 * 1024'te çok farklı uzunluktadır (1200px altında kart ızgarası tek sütuna
 * düşer). Yükseklik 100px basamağa YUKARI yuvarlanır: aynı platformda aynı
 * içerik → aynı pencere; alt-piksel oynaması kareyi değiştirmez.
 */
const FIT_MARGIN = 48;
const HEIGHT_STEP = 100;

/** Saat SENARYO GÜNÜNE çakılır — ekranın varsayılan günü BUGÜNdür (`isoDate(new Date())`). */
function scenarioInstant(scenario: DiaryProgressScenario): Date {
  return new Date(`${EV_DAY_SCENARIO_DAYS[scenario]}T09:00:00Z`);
}

/**
 * Giriş — saat NAVİGASYONDAN ÖNCE ve TEK KEZ, senaryo gününe çakılır.
 *
 * `earned-value-helpers.ts::login` saati 24.09.2026'ya çaktığı için burada
 * KULLANILMAZ: ikinci bir `setFixedTime` ile üstüne yazmak çalışsa bile
 * bekçinin (`visual-frame-guard`) gördüğü İLK dondurma yanlış güne ait olurdu.
 * Tek dondurma = tek gerçek (`site-diary-visual.spec.ts` deseni).
 */
async function loginAtScenarioDay(page: Page, scenario: DiaryProgressScenario, width: number) {
  await page.setViewportSize({ width, height: INITIAL_HEIGHT });
  await page.clock.setFixedTime(scenarioInstant(scenario));
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * Paylaşılan ikizin kadraja SIZABİLECEK iki ucu SABİTLENİR (`pinRoster`
 * deseni: yanıt süzülür, mock DURUMUNA dokunulmaz).
 *
 * 1) `GET /sites/s-1/diary?year=&month=` — "Son Kayıtlar" ayın EN YENİ üç
 *    kaydını basar. Ekim'in en yeni kaydı YAZMA HEDEFİ d-8'dir (09.10): Gönder
 *    akışı onun rozetini "Gönderilmedi" → "Gönderildi" çevirir ve işçi sayısı
 *    PATCH'le değişebilir. Liste kadraj günlerine süzülür → üç satır HER
 *    koşuda 08.10 · 07.10 · 06.10'dur. (Gün → kayıt eşlemesi de bu listeden
 *    yapılır; kadraj günleri süzgeçte KALDIĞI için etkilenmez.)
 * 2) `GET /subcontractors` — başka spec'lerin "+ Taşeron Ekle" ile POST ettiği
 *    `sub-new-*` firmaları İşçi Dağılımı'ndaki "+ Taşeron firma ekle"
 *    seçicisini (a)'da GÖRÜNÜR yapardı: iki firma da satırdayken eklenecek
 *    firma kalmaz ve seçici basılmaz.
 */
async function pinDiaryFrameSources(page: Page) {
  await page.route(
    (url) => /^\/api\/backend\/sites\/[^/]+\/diary$/.test(url.pathname) && url.searchParams.has("month"),
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const response = await route.fetch();
      const body = (await response.json()) as { items: { entry_date: string }[]; total: number };
      const items = body.items.filter((item) => VISUAL_DAYS.has(item.entry_date));
      await route.fulfill({
        status: response.status(),
        contentType: "application/json",
        body: JSON.stringify({ ...body, items, total: items.length }),
      });
    },
  );
  await page.route(
    (url) => url.pathname === "/api/backend/subcontractors",
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const response = await route.fetch();
      const body = (await response.json()) as { items: { id: string }[] };
      const items = body.items.filter((item) => !item.id.startsWith("sub-new-"));
      await route.fulfill({
        status: response.status(),
        contentType: "application/json",
        body: JSON.stringify({ ...body, items }),
      });
    },
  );
}

/** EV ucunun yanıtını bekleyen söz — `goto`dan ÖNCE kurulur (istek kaçmaz). */
function evResponse(page: Page, suffix: string): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname.startsWith("/api/backend/sites/") &&
      new URL(response.url()).pathname.endsWith(suffix),
  );
}

export interface OpenDiaryProgressOptions {
  width?: number;
  /** Formen görünümü: `earned_value` seviyesi istemcide düşürülür (sahte backend `no_planning_permission` üretmez). */
  evLevel?: "view";
}

/**
 * Günlük ekranını senaryo gününde açar ve BÜTÜN kaynakların indiğini
 * doğrular (GÖRSEL SPEC KURALI 1. + 5. parça), sonra pencereyi içeriğe
 * oturtur. EV'li günlerde (a)(b)(c) gün görünümü + kod ağacı + PF eşikleri
 * (ayar) + aktif bütçe; EV'siz günde (d) yalnız gün görünümü
 * (`has_baseline:false` → uzantı YOK).
 */
export async function openDiaryProgress(
  page: Page,
  scenario: DiaryProgressScenario,
  { width = DESKTOP_WIDTH, evLevel }: OpenDiaryProgressOptions = {},
) {
  await pinDiaryFrameSources(page);
  await loginAtScenarioDay(page, scenario, width);
  if (evLevel) await withEarnedValueLevel(page, evLevel);

  const day = EV_DAY_SCENARIO_DAYS[scenario];
  const hasEv = scenario !== "noEv";
  const waits = [
    evResponse(page, `/earned-value/days/${day}`),
    ...(hasEv
      ? [evResponse(page, "/earned-value/code-tree"), evResponse(page, "/earned-value/settings"), evResponse(page, "/earned-value/budget")]
      : []),
  ];
  await page.goto(DIARY_PROGRESS_URL);
  for (const response of await Promise.all(waits)) {
    expect(response.status(), new URL(response.url()).pathname).toBe(200);
  }

  await expect(page.getByRole("heading", { level: 1, name: "Günlük Kayıt & Planlama" })).toBeVisible();
  // Senaryo gününün KAYDI yüklendi (durum rozeti; (b) gönderilmiş, ötekiler taslak).
  await expect(page.locator(".diary__status-row .badge")).toHaveText(STATUS_LABEL[scenario]);
  // "Son Kayıtlar" SÜZÜLMÜŞ listeyi bastı: 08.10 · 07.10 · 06.10 (yazma hedefi 09.10 YOK).
  await expect(page.locator(".diary-recent__date")).toHaveText(["8 Ekim", "7 Ekim", "6 Ekim"]);
  if (hasEv) {
    // Uzantı kuruldu: başlık eki + Saat Dağıtımı; kolon başlıkları KOD AĞACINDAN
    // (ağaç gelmeden kod satırı boştur — `columnHeader` düşüşü).
    await expect(page.locator(".diary__subtitle-suffix")).toContainText(/Gün \d+ · H\d+/);
    await expect(page.locator(".ev-diary-alloc")).toBeVisible();
    await expect(page.locator(".ev-diary-grid__code-id").filter({ hasText: /\S/ }).first()).toBeVisible();
  } else {
    await expect(page.locator(".ev-diary-alloc")).toHaveCount(0);
  }
  // Yükleme metinleri kalmadı (plan önizleme · hakediş birikimi · son kayıtlar · kod ağacı).
  await expect(page.getByText(/[Yy]ükleniyor/)).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await fitViewportToDiary(page);
}

/** Pencere yüksekliği = ekran içeriğinin dibi + pay (100px basamak). Gerekçe: `FIT_MARGIN` yorumu. */
async function fitViewportToDiary(page: Page) {
  const width = page.viewportSize()?.width ?? DESKTOP_WIDTH;
  const diary = page.locator(".diary").first();
  const bottomOf = () => diary.evaluate((node) => node.getBoundingClientRect().bottom + window.scrollY);
  const height = Math.max(INITIAL_HEIGHT, Math.ceil(((await bottomOf()) + FIT_MARGIN) / HEIGHT_STEP) * HEIGHT_STEP);
  await page.setViewportSize({ width, height });
  // Sığma bekçisi: yeniden yerleşimden sonra da içerik pencerede (sessizce kırpılmaz).
  expect(await bottomOf(), "günlük içeriği pencereye sığmalı (fitViewportToDiary)").toBeLessThanOrEqual(height);
}
