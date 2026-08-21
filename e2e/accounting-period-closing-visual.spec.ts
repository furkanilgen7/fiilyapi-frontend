import { test, expect } from "@playwright/test";

import { ACCOUNTING_READ_TIME, loginAt, PERIOD_CLOSING_URL } from "./accounting-helpers";
import { prepareFrame } from "./visual-scroll";

// F-DKAP T2 · Dönem Kapanışı ekranının görsel kadrajları. Kanonik mockup:
// `Muhasebe - Dönem Kapanışı.dc.html` (DK).
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer.
//
// 🔒 SALT-OKUR TAM SAYFA + BİR DİYALOG KARESİ: ilk kare mock fikstürünün 2026
// dağılımını (kapalı/engelli/kapatılabilir/kayıt-yok DÖRDÜ birden) TEK
// kadrajda gösterir; ikinci kare onay diyaloğunun kendisidir (K8) — mock
// fikstürünün 2025 yazma adasına DOKUNMAZ (yalnız açar, ONAYLAMAZ), bu yüzden
// bu dosya paralel testleri MUTASYONLA oynatmaz.
//
// 📅 SAAT DONDURULUR (NAVİGASYONDAN ÖNCE): yıl seçici YEREL takvimden gelir.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta koşturulup commit
// edilmez.

const VISUAL_VIEWPORT = { width: 1440, height: 1400 } as const;

test("muhasebe donem kapanisi gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await loginAt(page, ACCOUNTING_READ_TIME);
  await page.goto(PERIOD_CLOSING_URL);
  await expect(page.getByTestId("dkap-loaded")).toBeAttached();

  // 1. parça — "yüklendi" durum-tabanlı iddia (WORKFLOW §4).
  await expect(page.getByRole("heading", { level: 1, name: "Dönem Kapanışı" })).toBeVisible();
  await expect(page.getByText(/yükleniyor/i)).toHaveCount(0);

  // DÖRT durumun HEPSİ kadrajda: K2/K3/K4'ün görsel kanıtı.
  // 🔴 SIRA-B: sayılar 6/1/1/4 → 6/1/2/3 (Ağustos artık sıra-engelli, Kasım
  // kapatılabilir); gerekçe fonksiyonel spec'in K4 testinde yazılıdır.
  await expect(page.getByTestId("dkap-summary")).toContainText(
    "6 kapalı · 1 kapatılabilir · 2 engelli · 3 kayıt yok",
  );
  await expect(page.getByTestId("dkap-status-1")).toContainText("Kapalı");
  await expect(page.getByTestId("dkap-status-8")).toContainText("Açık");
  await expect(page.getByTestId("dkap-blocked-reason-7")).toBeVisible();
  // 🔴 YENİ BANT kadrajda: Ağustos'un sıra gerekçesi. Görünürlüğü İDDİA
  // EDİLMEZSE kare bandı sessizce kaybedebilir ve kimse fark etmez.
  await expect(page.getByTestId("dkap-sequence-reason-8")).toBeVisible();
  await expect(page.getByTestId("dkap-status-9")).toContainText("Kayıt yok");

  // ⚠️ Engelli bandın taslak listesi BAĞIMSIZ bir kaynaktır
  // (`useJournalEntries`) — kadrajdan önce KENDİ oturduğu ayrıca ölçülür
  // (GÖRSEL SPEC KURALI 5. parça); aksi hâlde kare "Yükleniyor…" hâlini
  // donmuş yakalayabilir.
  await expect(page.getByTestId("dkap-draft-list-7").locator("li")).toHaveCount(2);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-donem-kapanisi.png", { fullPage: true });
});

test("muhasebe donem kapanisi onay diyalogu gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await loginAt(page, ACCOUNTING_READ_TIME);
  await page.goto(PERIOD_CLOSING_URL);
  await expect(page.getByTestId("dkap-loaded")).toBeAttached();

  // 2026 KASIM — kapatılabilir tek satır (mock fikstürünün OKUMA yılı,
  // MUTASYONA UĞRAMAZ: bu test yalnız diyaloğu AÇAR, "Dönemi Kapat"a BASMAZ).
  //
  // 🔴 SIRA-B devri: eskiden Ağustos'a tıklanıyordu; Ağustos artık SIRA-ENGELLİ
  // (öncesi Temmuz açık) ve düğmesi devre-dışıdır. Diyalog karesi 2025 YAZMA
  // adasına TAŞINMADI: kare `fullPage` çekilir, modalın ARKASINDAKİ tablo da
  // kadraja girer ve K8 mutasyonu (Haziran 2025) o tabloyu oynatarak kareyi
  // FLAKY yapardı. Bunun yerine 2026 OKUMA adasının içine kapatılabilir bir ay
  // (Kasım, öncesi Ekim KAYITSIZ) açıldı.
  await page.getByTestId("dkap-close-11").click();
  const dialog = page.getByRole("dialog", { name: "Kasım 2026 Kapatılsın mı?" });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("dkap-confirm-entry-count")).toContainText("34");
  // Diyaloğun İKİNCİ bağımsız veri kaynağı (`useTrialBalance`) de kadrajdan
  // önce OTURMALI — aksi hâlde kare "Yükleniyor…" hâlini donmuş yakalayabilir
  // (F-İK dersi, GÖRSEL SPEC KURALI 5. parça).
  await expect(page.getByTestId("dkap-confirm-balance")).not.toContainText("Yükleniyor");
  await expect(page.getByTestId("dkap-confirm-close")).toBeDisabled();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-donem-kapanisi-onay.png", { fullPage: true });
});
