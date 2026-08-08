import { test, expect, type Page } from "@playwright/test";

// F-P5 T3 · E14 (`/sozlesmeler/isveren/[projectId]`) fonksiyonel e2e.
// Kapsam: rotanın ComingSoon'dan çıkması, başlık + 5 metrik, Hakediş Özeti,
// sekme URL state'i (+ geri tuşu), İş Kalemleri kolonları, Hakedişler
// sekmesinin proje filtresi, Belgeler/Milestone PENDING'leri, devre-dışı
// PDF/Düzenle, POZ ekranına giriş.
//
// ⚠️ Dağılım/işveren sözleşmesi uçları YALNIZ `p-1` için veri döner (mock).
// ⚠️ `getByRole("alert")` KULLANILMAZ (Next route-announcer tuzağı).
// Bu dosya HİÇBİR mock kaydını mutasyona uğratmaz — yalnız okur.
// Zamanlayıcıya dayalı bekleme YOK.

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("işveren sözleşme detayı: listeden satıra tıklayınca açılır", async ({ page }) => {
  await login(page);
  await page.goto("/sozlesmeler");

  await page.getByRole("link", { name: "Detay →" }).first().click();
  await expect(page).toHaveURL(/\/sozlesmeler\/isveren\/p-1$/);
  await expect(page.getByText("Bu modül yakında eklenecek.")).toHaveCount(0);
  await expect(page.getByTestId("ecd-metrics")).toBeVisible();
});

test("işveren sözleşme detayı: başlık kartı + 5 metrik + devre-dışı butonlar", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/isveren/p-1");

  await expect(page.getByRole("heading", { name: "Kule A" })).toBeVisible();
  await expect(page.getByText("SZL-2025-01")).toBeVisible();

  const metrics = page.getByTestId("ecd-metrics");
  for (const label of [
    "Sözleşme Bedeli",
    "İmza Tarihi",
    "Başlangıç",
    "Bitiş Tarihi",
    "Avans",
  ]) {
    await expect(metrics.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(metrics.getByText("₺ 11,2M")).toBeVisible();

  // Üst kural: buton SİLİNMEZ, devre dışı + görünür gerekçe.
  await expect(page.getByTestId("ecd-pdf-disabled")).toBeDisabled();
  await expect(page.getByTestId("ecd-edit-disabled")).toBeDisabled();
  await expect(page.getByText(/Dışa aktarma modülüyle birlikte gelir/)).toBeVisible();
  await expect(page.getByText(/İşveren sözleşmesi proje formunda kurulur/)).toBeVisible();

  await expect(page.getByRole("link", { name: "← Sözleşmeler" })).toHaveAttribute(
    "href",
    "/sozlesmeler",
  );
});

test("işveren sözleşme detayı: Genel sekmesi — özet kartı, milestone PENDING, S3 koşulları", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/isveren/p-1");

  // Hakediş Özeti — `progress_payment_summary` birebir.
  await expect(page.getByTestId("ecd-pps-contract-amount")).toHaveText("₺ 11.200.000");
  await expect(page.getByTestId("ecd-pps-cumulative")).toHaveText("₺ 8.400.000");
  await expect(page.getByTestId("ecd-pps-caption")).toHaveText("%75 hakkedildi");
  await expect(page.getByTestId("ecd-pps-advance")).toHaveText("- ₺ 1.680.000");
  await expect(page.getByTestId("ecd-pps-retention")).toHaveText("- ₺ 420.000");

  // Milestone Takvimi: bölüm SİLİNMEZ, PENDING + gerekçe; sahte veri YOK.
  await expect(page.getByRole("heading", { name: "Milestone Takvimi" })).toBeVisible();
  await expect(page.getByTestId("ecd-milestones-pending")).toContainText(
    "Proje takvimi (P11) ile birlikte gelir",
  );
  await expect(page.getByText("Temel ve Bodrum Katlar")).toHaveCount(0);

  // §7 S3 — salt-okunur koşullar; ızgaranın DIŞINDA ayrı bölüm.
  const terms = page.getByTestId("ecd-terms");
  await expect(terms.getByTestId("ecd-term-vat")).toHaveText("%20");
  await expect(terms.getByTestId("ecd-term-escalation")).toHaveText("Var");
  await expect(terms.getByTestId("ecd-term-index")).toHaveText("TÜFE");
  await expect(terms.locator("input, select, textarea")).toHaveCount(0);
});

test("işveren sözleşme detayı: sekme durumu URL'dedir, geri tuşu çalışır", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/isveren/p-1");

  const tabs = page.getByRole("navigation", { name: "Sözleşme detay sekmeleri" });
  await expect(tabs.getByRole("link", { name: "Genel" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await tabs.getByRole("link", { name: "İş Kalemleri" }).click();
  await expect(page).toHaveURL(/\/sozlesmeler\/isveren\/p-1\?tab=items$/);
  await expect(tabs.getByRole("link", { name: "İş Kalemleri" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goBack();
  await expect(page).toHaveURL(/\/sozlesmeler\/isveren\/p-1$/);
  await expect(tabs.getByRole("link", { name: "Genel" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("işveren sözleşme detayı: İş Kalemleri sekmesi — dağıtılan/kalan kolonları + POZ girişi", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/isveren/p-1?tab=items");

  for (const header of [
    "Poz No",
    "Poz Adı",
    "Birim",
    "Sözl. Birim F.",
    "Toplam Miktar",
    "Dağıtılan",
    "Kalan",
  ]) {
    await expect(page.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
  }

  await expect(page.getByTestId("ecd-item-distributed").first()).toBeVisible();
  await expect(page.getByTestId("ecd-item-remaining").first()).toBeVisible();

  // POZ ekranına GÖRÜNÜR giriş (T4'te yazılacak rota).
  await expect(page.getByTestId("ecd-distribution-link")).toHaveAttribute(
    "href",
    "/sozlesmeler/isveren/p-1/poz-dagilimi",
  );
});

test("işveren sözleşme detayı: Hakedişler sekmesi proje filtrelidir", async ({ page }) => {
  await login(page);
  await page.goto("/sozlesmeler/isveren/p-1?tab=payments");

  // p-1 hakedişleri gelir; proje adı etiketi TEKRAR basılmaz (başlıkta var).
  const list = page.locator(".pp-list");
  await expect(list).toBeVisible();
  await expect(list.locator(".pp-row__project")).toHaveCount(0);
  await expect(list.getByRole("link").first()).toHaveAttribute(
    "href",
    /\/hakedisler\/[^/]+$/,
  );
});

test("işveren sözleşme detayı: Belgeler sekmesi basılır, içerik PENDING'dir", async ({
  page,
}) => {
  await login(page);
  await page.goto("/sozlesmeler/isveren/p-1?tab=documents");

  await expect(page.getByTestId("ecd-documents-pending")).toContainText(
    "Belge modülüyle birlikte gelir",
  );
  // Arşiv ekranı bu dilimde YAZILMAZ — tablo/yükleme yüzeyi yok.
  await expect(page.locator(".ecd-items")).toHaveCount(0);
});
