import { test, expect, type Page } from "@playwright/test";

import { settleScrollTop } from "./visual-scroll";

// P1 · Ekran 4 · Projeler (`/projeler`) görsel testi — mockup
// `Ekran 4 - Projeler.dc.html`.
//
// F-P10 T3: kadraj artık maliyet/kâr zarflarının GERÇEK değerlerini ve KY/KK
// kartlarının marj çipini taşır (P10 devri). WORKFLOW §4 "GÖRSEL SPEC KURALI"nın
// ÜÇ parçası da bu dosyada uygulanır: (1) yükleme oturdu iddiası,
// (2) `fullPage` kadrajdan önce kaydırma sıfırlama, (3) imleç parkı.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

/** Fikstür değerlerinin ekrandaki karşılığı (`formatCompactCurrency`/`formatPercent`). */
const CARD_VALUES = {
  /** p-1 taahhüt · "Harcanan" = `contracting.spent` 6.480.000. */
  contractingSpent: "₺ 6,5M",
  /** p-2 kendi yatırım · "Toplam Maliyet" 31.400.000 · "Tahmini Kâr" 16.800.000 · marj %34,85. */
  investmentCost: "₺ 31,4M",
  investmentProfit: "₺ 16,8M",
  investmentMargin: "%34,9 marj",
  /** p-3 kat karşılığı · "Kendi Pay Değeri" 26.400.000 · "İnşaat Maliyeti" 18.900.000 · marj %28,41. */
  landShareValue: "₺ 26,4M",
  landShareCost: "₺ 18,9M",
  landShareMargin: "%28,4 marj",
} as const;

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * Izgara GERÇEKTEN doldu mu — yükleme/iskelet hâli baseline'a girmesin
 * (WORKFLOW §4 görsel spec kuralı, 1. parça).
 *
 * `ProjectsView` istemci tarafında sorgular ve veri gelene kadar "Yükleniyor…"
 * basar; başlık iddiası tek başına yüklenmeyi kanıtlasa da ZARF değerlerini
 * kanıtlamaz. F-P10'dan sonra baseline'ın taşıdığı asıl içerik zarf
 * değerleridir → iddia doğrudan onlara bakar: değerler basılmadan çekilen kare
 * "—" yer tutucularını donduracaktı ve fark sessizce baseline'a girecekti.
 */
async function expectProjectCardsLoaded(page: Page) {
  await expect(page.getByRole("heading", { name: "Projeler" })).toBeVisible();

  const contracting = page.getByRole("link", { name: "Kule A projesini aç" });
  await expect(contracting).toContainText(CARD_VALUES.contractingSpent);

  const investment = page.getByRole("link", { name: "Villa B projesini aç" });
  await expect(investment).toContainText(CARD_VALUES.investmentCost);
  await expect(investment).toContainText(CARD_VALUES.investmentProfit);
  await expect(investment).toContainText(CARD_VALUES.investmentMargin);

  const landShare = page.getByRole("link", { name: "Bahçelievler Konut projesini aç" });
  await expect(landShare).toContainText(CARD_VALUES.landShareValue);
  await expect(landShare).toContainText(CARD_VALUES.landShareCost);
  await expect(landShare).toContainText(CARD_VALUES.landShareMargin);
}

test("projeler ekrani gorsel", async ({ page }) => {
  await login(page);

  await page.goto("/projeler");
  await expectProjectCardsLoaded(page);
  // Bu dosyada tek tıklama girişteki "Giriş Yap"tır ve ardından `/projeler`e
  // GEZİNİLİR (gezinme kaydırmayı zaten sıfırlar) — yani "tıklama + `fullPage`"
  // birleşimi burada dar anlamda YOKTUR. Korkuluk yine de uygulanır: ucuzdur ve
  // ileride kadraja bir etkileşim eklendiğinde sessizce bozulmayı önler.
  await settleScrollTop(page);

  // ⚠️ FARE KONUMU BASELINE'A SIZAR (WORKFLOW §4, 3. parça — F-BC dersi):
  // girişteki tıklamadan kalan imleç, gezinmeden sonra altındaki öğeyi `:hover`
  // hâlinde dondurur (F-BC baseline turunda `.sdoc-card:hover` ile fiilen oldu).
  // Bu ekranda şu an yalnız `.prj__new-btn` hover stili taşır — ama kural HER
  // kadraj için KOŞULSUZDUR: karta hover stili eklendiği gün kare sessizce
  // değişirdi. İmleç etkileşimli öğe olmayan uzak bir köşeye çekilir.
  await page.mouse.move(1439, 899);
  await expect(page).toHaveScreenshot("projects.png", { fullPage: true });
});
