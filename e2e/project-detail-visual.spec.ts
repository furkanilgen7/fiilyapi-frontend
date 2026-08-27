import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// Proje Detay ekranı görsel testi (Task 12). mock-backend.ts'teki p-1 (Kule A)
// projesine bağlı iki şantiyeyi (A-Blok aktif, B-Blok tamamlandı) kullanır —
// SiteCard'ın hem aktif hem tamamlanmış varyantını tek ekranda gösterir.
//
// F-PRJKALEM — sekme şeridinin "İş Kalemleri" iddiaları TERSİNE DÖNDÜ:
// sekme artık devre-dışı değil, sözleşme pozu ekranına giden canlı bir
// bağlantıdır. Tıklama davranışı fonksiyonel spec'te ölçülür
// (`e2e/project-detail-tabs.spec.ts`) — burada yalnız şeridin kendisi.
//
// F-PRJTAB T6 — SEKME ŞERİDİNİN ANLAM BEKÇİSİ: aşağıdaki durum iddiaları
// bilinçli olarak BU dosyada durur. 5. kapı (fonksiyonel e2e) bu dosyayı
// `--grep-invert "gorsel"` ile dışlar; yani buradaki iddialar YALNIZ görsel
// işinde koşar. Devre-dışı "İş Kalemleri" sekmesi böylece yalnız PİKSEL
// olarak değil, ANLAM olarak da (aria-disabled + href yokluğu + görünür
// gerekçe + canlı sekmelerin tam href'i) bekçilenir.
//
// Kadraj `fullPage` olduğu için sekme şeridi ve altındaki gerekçe notu
// baseline'ın İÇİNDEDİR — bu dilim için AYRI bir kare açılmaz.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta koşturulup commit
// edilmez.
test("proje detay ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1");
  // Yerleşim oturdu — İKİ BAĞIMSIZ veri kaynağı ayrı ayrı çözülür (F-İK
  // dersi): (a) proje sorgusu `useProject` → hero başlığı, (b) şantiye
  // sorgusu `useSites` → kart ızgarası + alt toplam şeridi. Biri gelmeden
  // kadraj alınırsa baseline "Yükleniyor…" hâlini dondurur.
  await expect(page.getByRole("heading", { level: 1, name: "Kule A" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A-Blok Şantiyesi", level: 3 })).toBeVisible();
  await expect(page.getByTestId("site-list-grid")).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  // --- Sekme şeridinin ANLAM iddiaları (kadrajdan ÖNCE) -------------------
  const tabs = page.getByRole("tablist", { name: "Proje detay sekmeleri" });
  await expect(tabs).toBeVisible();

  // 🔴 F-PRJKALEM · "İş Kalemleri" ARTIK CANLI: proje düzeyinde SÖZLEŞME POZU
  // vardır (`GET /projects/{id}/contract/items`) ve ekranı yazılıdır
  // (E14 `?tab=items`). Şantiye kartındaki çip ise ŞANTİYE BOQ'una gider —
  // farklı kümeler; ayrım `title`da anlatılır.
  const workItemsTab = tabs.getByRole("tab", { name: "İş Kalemleri" });
  await expect(workItemsTab).toBeVisible();
  await expect(workItemsTab).not.toHaveAttribute("aria-disabled", /.*/);
  await expect(workItemsTab).toHaveAttribute("href", "/sozlesmeler/isveren/p-1?tab=items");
  await expect(workItemsTab).toHaveAttribute(
    "title",
    "Sözleşme pozları - proje sözleşmesinin iş kalemleri",
  );

  // Devre-dışı sekme kalmadığı için gerekçe notu da BASILMAZ.
  await expect(page.getByTestId("project-tabs-work-items-reason")).toHaveCount(0);

  // Canlı sekmeler gerçek ekranlara gider; proje kimliği query string'de
  // taşınır ve param adları hedef ekranların BUGÜN okuduğu adlardır.
  await expect(tabs.getByRole("tab", { name: "İşveren Hakediş" })).toHaveAttribute(
    "href",
    "/hakedisler?project_id=p-1",
  );
  await expect(tabs.getByRole("tab", { name: "Taşeron Hakediş" })).toHaveAttribute(
    "href",
    "/hakedisler/taseron?project_id=p-1",
  );
  await expect(tabs.getByRole("tab", { name: "Belgeler" })).toHaveAttribute(
    "href",
    "/belgeler?proje=p-1",
  );
  // Bu ekranın kendisi seçili sekmedir (şeridin aktif varyantı baseline'da).
  await expect(tabs.getByRole("tab", { name: "Şantiyeler" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("proje-detay.png", { fullPage: true });
});
