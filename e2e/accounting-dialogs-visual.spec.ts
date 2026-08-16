import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTING_READ_TIME, openAccounting, openChartOfAccounts } from "./accounting-helpers";
import { prepareFrame } from "./visual-scroll";

// F-MU1 T6 · Muhasebe DİYALOGLARININ görsel kadrajları (T4 yüzeyleri).
// Ekran kadrajları AYRI dosyadadır (`accounting-visual.spec.ts`).
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER (5. kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer).
//
// 🔒 SALT-OKUR: üç kadrajın HİÇBİRİ "Kaydet"e basmaz — diyaloglar yalnız
// AÇILIR ve doldurulur. Denge şeridi, engel listesi ve Kaydet'in kapalılığı
// tamamen İSTEMCİ türevleridir, ağa çıkmazlar. Yazma akışları
// (`accounting-dialogs.spec.ts`) HAZİRAN adasındadır ve bu dosyanın TEMMUZ
// zeminine dokunamaz.
//
// 🔴 KADRAJ TÜRÜ = `fullPage` (ELEMAN kadrajı DEĞİL). Gerekçe
// `form-dialogs-visual.spec.ts` emsalinin aynısı: diyalog bir portal içinde
// `modal-overlay` katmanıyla basılır; eleman kadrajı örtüyü ve altındaki
// ekranı GÖSTERMEZ, oysa örtünün kararması ve arkadaki defterin
// konumlanması bu tasarımın ölçülmek istenen parçasıdır. `Modal` mutlak
// konumlu bir POPOVER değildir (`AnchoredPopover.place()` yuvarlama kanonu
// buraya UYGULANMAZ) — flex ile ortalanır, kesirli ölçüden konumlanmaz.
//
// 🔴 KAYDIRMA: diyaloglar TIKLAMAYLA açılır ve Playwright'ın `.click()`i
// hedefi görünür alana KAYDIRIR; `fullPage` kadraj da yapışkan kabuğu o
// ofsette basardı. `prepareFrame` bunu pencere VE her kaydırılabilir kap için
// iki eksende sıfırlar — ve `toHaveScreenshot`tan ÖNCEKİ SON satırdır.
//
// 📅 SAAT DONDURULUR: diyaloğun tarih alanı `todayIsoDate(new Date())` ile
// dolar (TB5 dersi: `toISOString()` UTC'ye kaydırır). Dondurulmasaydı kare
// her gün DEĞİŞİRDİ.
//
// ⚠️ Sabit `waitForTimeout` YOKTUR; her bekleme durum tabanlıdır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/** Dondurulmuş günün ISO karşılığı — diyaloğun tarih alanı bununla dolar. */
const READ_TIME_ISO_DATE = "2026-07-20";

async function expectNoLoadingText(page: Page) {
  await expect(page.getByText(/yükleniyor/i)).toHaveCount(0);
  await expect(page.getByTestId("mu-entry-dialog-loading")).toHaveCount(0);
}

/**
 * `/muhasebe`yi (DÖRT kaynak da yüklü) açar, "+ Yevmiye Kaydı"na basar ve
 * diyaloğun KENDİ kaynağının indiğini doğrular.
 *
 * 🔴 Diyalog ekranın kaynaklarını MİRAS ALMAZ: `JournalEntryFormModal` kendi
 * `useChartOfAccounts` sorgusunu açar ve satır seçicileri o veriyle dolar.
 * Beklenmeden alınan kare BOŞ seçicileri dondururdu.
 */
async function openEntryDialog(page: Page) {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openAccounting(page, ACCOUNTING_READ_TIME);
  // Zemin gerçekten DOLU (kadrajın arka planı da baseline'ın parçasıdır).
  await expect(page.getByTestId("mu-period-label")).toHaveText("Temmuz 2026");
  await expect(page.getByTestId("mu-carried-balance")).toBeVisible();

  await page.getByTestId("mu-create-entry").click();
  const dialog = page.getByRole("dialog", { name: "Yeni Yevmiye Fişi" });
  await expect(dialog).toBeVisible();
  // YÜKLENDİ — diyaloğun KENDİ hesap kataloğu: yaprak hesap seçenekleri geldi.
  await expect(dialog.getByTestId("mu-line-account-0").locator('option[value="coa-100"]')).toHaveCount(1);
  await expect(dialog.getByTestId("mu-line-account-1").locator('option[value="coa-600"]')).toHaveCount(1);
  await expect(dialog.getByTestId("mu-entry-accounts-error")).toHaveCount(0);
  // 📅 `page.clock` KANITI: tarih alanı dondurulmuş GÜNDEN dolar.
  await expect(dialog.getByTestId("mu-entry-date")).toHaveValue(READ_TIME_ISO_DATE);
  return dialog;
}

// ---------------------------------------------------------------------------
// 1) Yevmiye Kaydı — DENGESİZ hâl (kırmızı fark + Kaydet kapalı)
// ---------------------------------------------------------------------------
test("yevmiye kaydi diyalogu dengesiz gorsel", async ({ page }) => {
  const dialog = await openEntryDialog(page);

  await dialog.getByTestId("mu-entry-description").fill("Hakediş Tahsilatı – Güneşkent");
  await dialog.getByTestId("mu-entry-detail-note").fill("Ziraat Bank · TRF-20260717");
  await dialog.getByTestId("mu-line-account-0").selectOption("coa-100");
  await dialog.getByTestId("mu-line-account-1").selectOption("coa-600");
  await dialog.getByTestId("mu-line-debit-0").fill("1000");
  await dialog.getByTestId("mu-line-credit-1").fill("400");

  // Kadrajın KONUSU: fark şeridi kırmızı, engel listesi dolu, Kaydet KAPALI.
  await expect(dialog.getByTestId("mu-balance-difference")).toHaveText("600");
  // 🔴 İDDİA GÖÇÜ (F-MUF T4): tek cümle ("Fiş dengede değil; kaydedilemez.")
  // BAŞLIK + AYRI gerekçe satırına ikiye ayrıldı (`mu-balance-state-detail`).
  await expect(dialog.getByTestId("mu-balance-state")).toHaveText("Fiş dengede değil");
  await expect(dialog.getByTestId("mu-balance-state-detail")).toHaveText(
    "Borç ve alacak toplamları eşit olmadan kaydedilemez",
  );
  await expect(dialog.getByTestId("mu-entry-dialog-blockers")).toBeVisible();
  await expect(dialog.getByTestId("mu-entry-dialog-save")).toBeDisabled();
  // 🔴 TEK TARAF kilidi de kadrajda: borç dolu satırın alacak kutusu KAPALI.
  await expect(dialog.getByTestId("mu-line-credit-0")).toBeDisabled();
  await expectNoLoadingText(page);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-fis-dengesiz.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) Yevmiye Kaydı — DENGELİ hâl (yeşil + Kaydet açık)
// ---------------------------------------------------------------------------
test("yevmiye kaydi diyalogu dengeli gorsel", async ({ page }) => {
  const dialog = await openEntryDialog(page);

  await dialog.getByTestId("mu-entry-description").fill("Hakediş Tahsilatı – Güneşkent");
  await dialog.getByTestId("mu-entry-detail-note").fill("Ziraat Bank · TRF-20260717");
  await dialog.getByTestId("mu-line-account-0").selectOption("coa-100");
  await dialog.getByTestId("mu-line-account-1").selectOption("coa-600");
  await dialog.getByTestId("mu-line-debit-0").fill("1000");
  await dialog.getByTestId("mu-line-credit-1").fill("1000");

  // Kadrajın KONUSU: fark sıfır, şerit YEŞİL, engel listesi YOK, Kaydet AÇIK.
  await expect(dialog.getByTestId("mu-balance-difference")).toHaveText("0");
  // 🔴 İDDİA GÖÇÜ (F-MUF T4): "Fiş dengede." → "Fiş dengede" (nokta düştü,
  // gerekçe AYRI `mu-balance-state-detail`e taşındı).
  await expect(dialog.getByTestId("mu-balance-state")).toHaveText("Fiş dengede");
  await expect(dialog.getByTestId("mu-balance-state-detail")).toHaveText("Kaydedilmeye hazır");
  await expect(dialog.getByTestId("mu-entry-dialog-blockers")).toHaveCount(0);
  await expect(dialog.getByTestId("mu-entry-dialog-save")).toBeEnabled();
  await expect(dialog.getByTestId("mu-entry-dialog-error")).toHaveCount(0);
  await expectNoLoadingText(page);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-fis-dengeli.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) Hesap Ekle — BOŞ form (gerekçe/engel bandı görünür)
// ---------------------------------------------------------------------------
test("hesap ekle diyalogu gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openChartOfAccounts(page);
  // Zemin DOLU: tablo gerçekten basıldı (kadrajın arka planı da baseline'dır).
  await expect(page.getByTestId("hp-row-120.01")).toBeVisible();
  await expect(page.getByTestId("hp-balance-257")).toHaveText("(620.000)");

  await page.getByTestId("hp-create").click();
  // 🔴 İDDİA GÖÇÜ (F-MUF T2): başlık "Yeni Hesap" → "Yeni Hesap Ekle".
  const dialog = page.getByRole("dialog", { name: "Yeni Hesap Ekle" });
  await expect(dialog).toBeVisible();

  // Diyaloğun KENDİ sorgusu YOKTUR (form tamamen istemci durumudur) — bu
  // yüzden "yüklendi" iddiası ALTTAKİ ekranın kaynağıdır (`hp-loaded`,
  // `openChartOfAccounts` içinde) + formun türev yüzeyleri:
  // 🔴 Boş formda engel listesi GÖRÜNÜR ve Kaydet KAPALIdır — kadrajın konusu.
  await expect(dialog.getByTestId("hp-dialog-blockers")).toBeVisible();
  await expect(dialog.getByTestId("hp-dialog-save")).toBeDisabled();
  // Kod ipucu (HP:47 biçim gerekçesi) da kadrajda okunur.
  await expect(dialog.getByText("Grup 10 · ana hesap 100 · alt hesap 100.01")).toBeVisible();
  // Tür seçici BEŞ üyeli kapalı enumu taşır; "Kullanımda" anahtarı AÇIKtır.
  // 🔴 BİLİNÇLİ GÖÇ (MT-1/KK-1 devri, 2026-08-16): iddia DÖRT'ten BEŞ'e taşındı,
  // gevşetilmedi. `equity` beşinci üye olarak açıldı (kullanıcı kararı). Sayım
  // iddiası KALIR: enum kapalıdır ve sessizce büyümesi görülmelidir.
  // 🔴 İKİNCİ GÖÇ (F-MUF T2): BEŞ'ten ALTI'ya — `Tür seçiniz...` SEÇİLEMEZ
  // (disabled) placeholder `<option>`u eklendi (K8). Seçenek sayımı gene KALIR,
  // gevşetilmedi.
  await expect(dialog.getByTestId("hp-dialog-type").locator("option")).toHaveCount(6);
  await expect(dialog.getByTestId("hp-dialog-active")).toBeChecked();
  await expect(dialog.getByTestId("hp-dialog-error")).toHaveCount(0);
  // 🔴 YENİ YÜZEY (F-MUF T2): kontra onay kutusu + canlı önizleme kadraja
  // girdi (diyalog ~2× uzadı). Boş formda varsayılan tür `asset`, kontra
  // İŞARETLİ DEĞİL → önizleme "Normal — aktif toplama eklenir" der.
  await expect(dialog.getByTestId("hp-dialog-contra")).not.toBeChecked();
  await expect(dialog.getByTestId("hp-dialog-contra-help")).toBeVisible();
  await expect(dialog.getByTestId("hp-dialog-preview")).toHaveText(
    "Normal — aktif toplama eklenir",
  );
  await expect(dialog.getByTestId("hp-dialog-preview-head")).toContainText("Aktif");
  await expectNoLoadingText(page);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-hesap-ekle.png", { fullPage: true });
});
