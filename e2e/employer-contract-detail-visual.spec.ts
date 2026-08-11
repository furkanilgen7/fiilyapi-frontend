import { test, expect } from "@playwright/test";

import { login, pinEmployerContractItems, prepareFrame } from "./contracts-visual-helpers";

// F-P5 T8 · E14 (`/sozlesmeler/isveren/p-1`) görsel testleri. Kanon:
// projedesign `Ekran 14 - Sözleşme Detay.dc.html`.
//
// Üç sekme AYRI kare olarak basılır ve sekme durumu URL'den kurulur
// (`?tab=`) — sekmeye TIKLANMAZ, yani kadraj gezinme zamanlamasından
// bağımsızdır ve "tıklama + `fullPage`" birleşimi hiç oluşmaz. (Hakedişler
// sekmesi kadraja alınmaz: aynı `ProgressPaymentsListBody` bileşeni
// `progress-payments-visual.spec.ts`te zaten baseline'lıdır.)
//
// ⚠️ `.ecd` kökünde `animation: var(--anim-fade-up)` vardır ve bu ekranda
// FİİLEN yaşandı: durum-tabanlı iddia olmadan kare fade'in ortasında düşüyor.
// Her karede kadrajdan ÖNCE sekmenin KENDİ içeriğine bakan bir iddia vardır.
//
// 🔒 FİKSTÜR İZOLASYONU: bu dosya HİÇBİR kayda dokunmaz. Genel/Belgeler
// sekmeleri sabit `EMPLOYER_CONTRACT_P1`ten beslenir. İş Kalemleri sekmesi ise
// `state.contractItems`ten türer — `contract-distribution.spec.ts`in geçici
// 1.800 → 1.900 penceresiyle YARIŞIR, bu yüzden GET yanıtı `pinEmployerContract
// Items` ile tohum kotalarına sabitlenir (paylaşılan mock durumu DEĞİŞMEZ).
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

const URL = "/sozlesmeler/isveren/p-1";

test("isveren sozlesme detayi genel sekmesi gorsel", async ({ page }) => {
  await login(page);
  await page.goto(URL);

  await expect(page.getByRole("heading", { level: 1, name: "Kule A" })).toBeVisible();
  // Yerleşim oturdu: başlık kartının metrikleri + Hakediş Özeti'nin türev
  // yüzdesi basıldı ("Yükleniyor…" dalı geçildi).
  await expect(page.getByTestId("ecd-metrics")).toBeVisible();
  await expect(page.getByTestId("ecd-pps-caption")).toHaveText("%75 hakkedildi");
  // §7 S3 "Sözleşme Koşulları" bloğu kadrajda ZORUNLU (dilimin onaylı eki).
  await expect(page.getByTestId("ecd-term-index")).toHaveText("TÜFE");
  await expect(page.getByTestId("ecd-milestones-pending")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("isveren-sozlesme-genel.png", { fullPage: true });
});

test("isveren sozlesme detayi is kalemleri sekmesi gorsel", async ({ page }) => {
  await login(page);
  await pinEmployerContractItems(page);
  await page.goto(`${URL}?tab=items`);

  await expect(page.getByRole("heading", { level: 1, name: "Kule A" })).toBeVisible();
  // Yerleşim oturdu: tablo GERÇEKTEN doldu — "Dağıtılan"/"Kalan" türev
  // hücreleri ve toplam satırı basıldı (yükleme durumu dondurulmasın).
  await expect(page.getByTestId("ecd-item-distributed").first()).toBeVisible();
  await expect(page.getByTestId("ecd-item-remaining").first()).toBeVisible();
  await expect(page.getByTestId("ecd-items-total")).toBeVisible();
  await expect(page.getByTestId("ecd-distribution-link")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("isveren-sozlesme-kalemler.png", { fullPage: true });
});

test("isveren sozlesme detayi belgeler sekmesi gorsel", async ({ page }) => {
  await login(page);
  await page.goto(`${URL}?tab=documents`);

  await expect(page.getByRole("heading", { level: 1, name: "Kule A" })).toBeVisible();
  // Yerleşim oturdu: PENDING kartı basıldı (bölüm SİLİNMEZ kuralının kanıtı
  // baseline'a girer); arşiv yüzeyi bu dilimde YOKTUR.
  await expect(page.getByTestId("ecd-documents-pending")).toContainText(
    "Belge modülüyle birlikte gelir",
  );

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("isveren-sozlesme-belgeler.png", { fullPage: true });
});
