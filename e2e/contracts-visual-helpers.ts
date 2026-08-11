import { expect, type Page } from "@playwright/test";

// F-P5 T8 · Sözleşme ekranlarının görsel spec'lerinin ORTAK yardımcıları.
// Altı görsel dosya (SZL · E14 · POZ · TL · FSO · TSD) aynı oturum açma,
// aynı kaydırma korkuluğu ve aynı fikstür sabitleme mantığını kullanır —
// dosya başına kopyalamak yerine tek yerde tutulur.
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR, Playwright'ın `testMatch`i onu test
// dosyası olarak toplamaz; yalnız import edilir.
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

/**
 * Kaydırma korkuluğu ORTAK modüldedir (`visual-scroll.ts`); buradan
 * re-export edilir ki bu dilimin altı görsel spec'i tek yerden import etsin.
 *
 * Bu dilime özgü not: kadrajların HİÇBİRİ tıklamaz (sekme geçişleri bile URL
 * `?tab=`/`?type=` ile kurulur), yani açık olan "tıklama + `fullPage`"
 * birleşimi burada YOKTUR. Korkuluk yine de uygulanır: ucuzdur ve sayfa
 * büyüdükçe/ileride bir kadraja etkileşim eklendiğinde sessizce bozulmayı
 * önler. İmleç parkı (3. parça) ise zaten KOŞULSUZDUR — giriş tıklaması
 * imleci sonraki sayfanın üstünde bırakır.
 */
export { prepareFrame, settleScrollTop } from "./visual-scroll";

// ---------------------------------------------------------------------------
// 🔒 FİKSTÜR SABİTLEME — `state.contractItems`
// ---------------------------------------------------------------------------
// Mock durumu tüm koşu boyunca TEKtir ve spec'ler PARALEL koşar. Bu dilimin
// fonksiyonel e2e'lerinden YALNIZ `contract-distribution.spec.ts` kalıcı bir
// mutasyon yapar: `ci-1`/`s-1` kotasını 1.800 → 1.900 yapar, kanıtı alır ve
// 1.800'e GERİ ALIR. Geri alınması kadrajı KURTARMAZ — pencere sırasında
// çekilen kare 1.900'ü basardı ve `fullyParallel` altında dosya sırası garanti
// olmadığı için baseline kâh 1.800'lü kâh 1.900'lü üretilirdi (F-PT'nin
// `pinRoster` dersiyle aynı sınıf: kaçınılmaz görsel CI kırmızısı).
//
// Çözüm aynı desendir: paylaşılan mock durumuna DOKUNULMAZ, yalnız TEK GET
// yanıtı kadraj için tohum değerine geri yazılır. Türev alanlar (kalan miktar,
// şantiye özet tutarları) yeniden HESAPLANIR — hücreyi sabitleyip özeti
// bırakmak kareyi yine deterministik olmaktan çıkarırdı.
//
// Sabitleme KİMLİK tabanlıdır: ileride başka bir hücre mutasyona uğrarsa
// `PINNED_QUANTITIES` genişletilir.

/** `mock-backend.ts` · `CONTRACT_ITEMS_P1` tohumu (poz 03.001). */
const PINNED_ITEM_ID = "ci-1";
const PINNED_QUANTITIES: Readonly<Record<string, string>> = {
  "s-1": "1800.000",
  "s-2": "1400.000",
};

const DISTRIBUTION_PATH = "/api/backend/projects/p-1/contract/distribution";
const ITEMS_PATH = "/api/backend/projects/p-1/contract/items";

interface DistributionAllocation {
  site_id: string;
  quantity: string;
}

interface DistributionItem {
  id: string;
  code: string;
  quantity: string;
  unit_price: string;
  allocations: DistributionAllocation[];
  remaining_quantity: string;
}

interface DistributionGroup {
  items: DistributionItem[];
}

interface DistributionSummaryItem {
  code: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

interface DistributionSiteSummary {
  site_id: string;
  items: DistributionSummaryItem[];
  total_amount: string;
}

interface DistributionResponse {
  groups: DistributionGroup[];
  site_summaries: DistributionSiteSummary[];
}

interface ContractItemRow {
  id: string;
  quantity: string;
  distributed_quantity: string;
  remaining_quantity: string;
}

interface ContractItemsResponse {
  groups: { items: ContractItemRow[] }[];
}

const quantity3 = (value: number) => value.toFixed(3);
const money2 = (value: number) => value.toFixed(2);

/** Tohum kotalarının toplamı — türev alanların tek kaynağı. */
function pinnedTotal(): number {
  return Object.values(PINNED_QUANTITIES).reduce((sum, value) => sum + Number(value), 0);
}

function pinDistributionItem(item: DistributionItem): DistributionItem {
  if (item.id !== PINNED_ITEM_ID) return item;
  const allocations = item.allocations.map((allocation) => ({
    ...allocation,
    quantity: PINNED_QUANTITIES[allocation.site_id] ?? allocation.quantity,
  }));
  return {
    ...item,
    allocations,
    remaining_quantity: quantity3(Number(item.quantity) - pinnedTotal()),
  };
}

function pinSiteSummary(
  summary: DistributionSiteSummary,
  pinnedCode: string | null,
): DistributionSiteSummary {
  const pinnedQuantity = PINNED_QUANTITIES[summary.site_id];
  if (pinnedCode === null || pinnedQuantity === undefined) return summary;

  const items = summary.items.map((item) => {
    if (item.code !== pinnedCode) return item;
    return {
      ...item,
      quantity: pinnedQuantity,
      amount: money2(Number(pinnedQuantity) * Number(item.unit_price)),
    };
  });
  return {
    ...summary,
    items,
    total_amount: money2(items.reduce((sum, item) => sum + Number(item.amount), 0)),
  };
}

/**
 * POZ ızgarasının GET yanıtını tohum kotalarına sabitler (ızgara hücresi +
 * kalan miktar + şantiye özet tutarları birlikte).
 */
export async function pinContractDistribution(page: Page) {
  await page.route(
    (url) => url.pathname === DISTRIBUTION_PATH,
    async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as DistributionResponse;

      const groups = body.groups.map((group) => ({
        ...group,
        items: group.items.map(pinDistributionItem),
      }));
      const pinnedCode =
        groups.flatMap((group) => group.items).find((item) => item.id === PINNED_ITEM_ID)?.code ??
        null;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...body,
          groups,
          site_summaries: body.site_summaries.map((summary) =>
            pinSiteSummary(summary, pinnedCode),
          ),
        }),
      });
    },
  );
}

/**
 * E14 "İş Kalemleri" sekmesinin GET yanıtını tohum kotalarına sabitler —
 * "Dağıtılan" / "Kalan" kolonları AYNI `state.contractItems`ten türer, yani
 * POZ kadrajıyla aynı yarışa açıktır.
 */
export async function pinEmployerContractItems(page: Page) {
  await page.route(
    (url) => url.pathname === ITEMS_PATH,
    async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as ContractItemsResponse;
      const total = pinnedTotal();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...body,
          groups: body.groups.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === PINNED_ITEM_ID
                ? {
                    ...item,
                    distributed_quantity: quantity3(total),
                    remaining_quantity: quantity3(Number(item.quantity) - total),
                  }
                : item,
            ),
          })),
        }),
      });
    },
  );
}
