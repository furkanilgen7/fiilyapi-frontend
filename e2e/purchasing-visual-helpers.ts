import { expect, type Page, type Route } from "@playwright/test";

// F-SA T5a · Satınalma görsel spec'lerinin ORTAK yardımcıları (SAT · SIP ·
// TEK · FST · TED). `contracts-visual-helpers.ts` deseninin aynısı.
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; Playwright onu test dosyası olarak
// toplamaz, yalnız import edilir. `prepareFrame` BURADAN RE-EXPORT EDİLMEZ:
// görsel kadraj bekçisi (`src/test-guards/visual-frame-guard.test.ts`) yalnız
// `from "./visual-scroll"` yazan spec'leri tarar — kanonu dolaylı almak
// spec'i bekçinin kapsamından ÇIKARIRDI.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

/** Görsel kadrajların ORTAK penceresi — mevcut görsel spec'lerle aynı. */
export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

export async function login(page: Page) {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

// ---------------------------------------------------------------------------
// 🔒 FİKSTÜR SABİTLEME — satınalma listeleri
// ---------------------------------------------------------------------------
// Mock durumu tüm koşu boyunca TEKtir ve spec'ler PARALEL koşar
// (`fullyParallel: true`). Bu dilimin yazma e2e'si (`purchasing-flows.spec.ts`)
// KALICI kayıtlar doğurur: bir tedarikçi, bir talep, bir teklif ve bir sipariş.
// Bunlar SATINALMA LİSTELERİNİN TAMAMINDA görünür — SAT tablosu, SIP tablosu,
// TED ızgarası ve KPI şeridi (`/purchasing/summary`) sayılarında. Sabitleme
// olmadan baseline kâh 4 kartlı kâh 5 kartlı üretilirdi ve
// `playwright.config.ts`te eşik ayarı olmadığı için hangi varyant girerse
// öbürü CI'da KIRMIZI olurdu (F-P5 `pinContractDistribution` / F-PT `pinRoster`
// dersleriyle AYNI sınıf).
//
// Çözüm de aynı desendir: paylaşılan mock durumuna DOKUNULMAZ, yalnız GET
// yanıtları kadraj için tohum kümesine daraltılır. İki yöntem kullanılır:
//
//   1. KAPSAM DARALTMA (talepler · siparişler · özet): istek `project_id=p-1`
//      ile İLERİ SÜRÜLÜR. Bütün satınalma fikstürleri `p-1`dedir, yazma e2e'si
//      ise bilerek `p-2`de yürür → sunucunun kendi süzgeci kadrajı fikstürlere
//      indirger. Gövde ELLE KURULMAZ: `total` da sunucudan tutarlı gelir,
//      yoksa kırpılma bandı (`items.length < total`) sahte biçimde açılırdı.
//   2. GÖVDE SÜZME (tedarikçiler): bu ucun proje süzgeci YOKTUR. Mock yeni
//      kayıtları `sup-new-*` kimliğiyle üretir (`Date.now()` yok, T1 kararı),
//      bu yüzden tohum dışı kartlar kimlikten ayıklanır ve `total` süzülmüş
//      sayıya çekilir.
//
// Sabitleme KİMLİK/KAPSAM tabanlıdır: kadrajın gördüğü HER DEĞER yine
// sunucudan gelir — sahte bir sayı yazılmaz.

/** Satınalma fikstürlerinin projesi (`mock-backend.ts` · `p-1` = "Kule A"). */
const FIXTURE_PROJECT_ID = "p-1";

/** Mock'un koşu sırasında ürettiği tedarikçi kimliklerinin ön eki. */
const CREATED_SUPPLIER_PREFIX = "sup-new-";

const SCOPED_PATHS = [
  "/api/backend/purchase-requests",
  "/api/backend/purchase-orders",
  "/api/backend/purchasing/summary",
] as const;

const SUPPLIERS_PATH = "/api/backend/suppliers";

/** İsteği `project_id=p-1` ile ileri sürer (süzgeci SUNUCU uygular). */
async function forwardWithFixtureProject(route: Route) {
  const url = new URL(route.request().url());
  url.searchParams.set("project_id", FIXTURE_PROJECT_ID);
  const response = await route.fetch({ url: url.toString() });
  await route.fulfill({ response });
}

interface SupplierListBody {
  items: { id: string }[];
  total: number;
}

/** Koşu sırasında doğan tedarikçileri kadrajdan ayıklar. */
async function dropCreatedSuppliers(route: Route) {
  const response = await route.fetch();
  const body = (await response.json()) as SupplierListBody;
  const items = body.items.filter((item) => !item.id.startsWith(CREATED_SUPPLIER_PREFIX));

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ...body, items, total: items.length }),
  });
}

/**
 * Satınalma kadrajlarını tohum fikstürlerine sabitler. NAVİGASYONDAN ÖNCE
 * çağrılır; kullanmayan ekranlarda etkisizdir (no-op).
 */
export async function pinPurchasingFixtures(page: Page) {
  for (const path of SCOPED_PATHS) {
    await page.route((url) => url.pathname === path, forwardWithFixtureProject);
  }
  await page.route((url) => url.pathname === SUPPLIERS_PATH, dropCreatedSuppliers);
}
