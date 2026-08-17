import { expect, type Page } from "@playwright/test";

/**
 * F-TKV — Proje Takvimi e2e yardımcıları.
 *
 * 🔴 TARİH DETERMİNİZMİ İKİ KAYNAKLIDIR:
 *  1. `today` **sunucu damgasıdır** (`ProjectTimelineResponse.today`); mock
 *     sabit `2026-07-17` döner ve `page.clock` bunu ETKİLEMEZ. Bugün çizgisi
 *     ve "Yaklaşan Teslimat" bu damgadan hesaplanır.
 *  2. Ekranda istemci `new Date()` türevi YOKTUR — pencere de veriden türer.
 *     Yine de kabuk/oturum katmanı saate bakabildiği için görsel turlarda saat
 *     sabitlenir; `setFixedTime` GİRİŞTEN SONRA çağrılır (`leaves-visual.spec
 *     .ts` ölçümü: girişten önce çağrılırsa giriş akışı hiç tamamlanmaz).
 */
export const TIMELINE_URL = "/projeler/takvim";

/** Mock backend'in sunucu damgası (`mock-backend.ts` MOCK_TIMELINE_TODAY). */
export const SERVER_TODAY = "2026-07-17";

/** Görsel turlarda istemci saatini sabitler (kabuk katmanı için). */
export const FIXED_NOW = "2026-07-17T09:00:00Z";

export const TIMELINE_VIEWPORT = { width: 1440, height: 900 } as const;

export async function login(page: Page, viewport = TIMELINE_VIEWPORT) {
  await page.setViewportSize({ ...viewport });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

interface TimelineBody {
  today: string;
  items: { id: string; sections: { id: string }[] }[];
}

/** Seed fikstürünün kimlikleri — `mock-backend.ts` `PROJECT_FIXTURES`/`sections`. */
const SEED_PROJECT_IDS = new Set(["p-1", "p-2", "p-3", "p-4"]);
const SEED_SECTION_IDS = new Set(["sec-1", "sec-2", "sec-3"]);

/**
 * 🔴 FİKSTÜR SÜZGECİ (kanonik `pinLeaveRequests` deseni). Mock backend TEK ve
 * PAYLAŞILAN bir state taşır, Playwright `fullyParallel` koşar ve başka
 * spec'ler GERÇEKTEN yazma yapar: `section-form.spec.ts` s-1 altına yeni bir
 * bölüm ekler, `project-form`/`site-form` akışları yeni proje/şantiye açar.
 * Süzgeç olmadan buradaki sayımlar (bar/sütun/milestone) test SIRASINA bağlı
 * olurdu — yani kapı bazen yeşil, bazen kırmızı. Süzgeç yanıtı seed kümesine
 * daraltır; `today` damgası sunucudan gelmeye DEVAM eder.
 */
export async function pinTimeline(page: Page) {
  await page.route("**/api/backend/projects/timeline", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as TimelineBody;
    const items = body.items
      .filter((item) => SEED_PROJECT_IDS.has(item.id))
      .map((item) => ({
        ...item,
        sections: item.sections.filter((section) => SEED_SECTION_IDS.has(section.id)),
      }));
    await route.fulfill({ response, body: JSON.stringify({ today: body.today, items }) });
  });
}

/**
 * Ekranın YÜKLENDİĞİ durum-tabanlı iddia (görsel spec kuralı 1 + 5). Takvim
 * ekranını besleyen veri kaynağı TEKTİR (`GET /projects/timeline`) — hook
 * katmanına bakılarak doğrulandı, tahmin edilmedi — ama o tek yanıttan üç
 * BAĞIMSIZ yüzey türer: ızgara penceresi, satırlar ve portföy özeti. Üçü de
 * ayrı ayrı beklenir ki hiçbiri "—"/"Yükleniyor…" hâlinde donmuş yakalanmasın.
 */
export async function expectTimelineLoaded(page: Page) {
  await expect(page.getByTestId("tkv-range")).toHaveText("Oca 2023 – Mar 2027");
  await expect(page.getByTestId("tkv-project-bar").first()).toBeVisible();
  await expect(page.getByTestId("tkv-total-contract")).toHaveText("₺ 20,6M");
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);
}

/**
 * BOŞ portföy hâli — `takvim-bos` karesi ve boş dal testi için. Gerçek uca
 * gider ve gövdenin YALNIZ `items`ını boşaltır; `today` damgası sunucudan
 * gelmeye devam eder (uydurulmaz).
 */
export async function pinEmptyPortfolio(page: Page) {
  await page.route("**/api/backend/projects/timeline", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as TimelineBody;
    await route.fulfill({
      response,
      body: JSON.stringify({ today: body.today, items: [] }),
    });
  });
}
