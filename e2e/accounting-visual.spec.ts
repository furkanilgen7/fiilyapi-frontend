import { test, expect, type Page } from "@playwright/test";

import {
  ACCOUNTING_EMPTY_TIME,
  openAccounting,
  openChartOfAccounts,
} from "./accounting-helpers";
import { prepareFrame } from "./visual-scroll";

// F-MU1 T6 · Muhasebe EKRANLARININ görsel kadrajları. Kanonik mockup'lar:
// `Muhasebe - Yevmiye Defteri.dc.html` (E8) · `Muhasebe - Hesap
// Planı.dc.html` (HP). Diyalog kadrajları AYRI dosyadadır
// (`accounting-dialogs-visual.spec.ts`).
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer; içermeyen bir görsel test
// fonksiyonel turda baseline'sız koşar ve KIRMIZI olur.
//
// 🔒 SALT-OKUR: bu dosya hiçbir POST/PATCH/DELETE tetiklemez. Muhasebe
// yazma akışları (`accounting-dialogs.spec.ts`) HAZİRAN 2026'ya sürgündür ve
// defter/özet/fiş uçlarının hepsi DÖNEM süzgeçlidir ⇒ `fullyParallel` altında
// bu dosyanın TEMMUZ kadrajına yapısal olarak sızamazlar. Hesap planının
// dönem süzgeci YOKTUR; orada izolasyonu mock backend sağlar (e2e'de
// OLUŞTURULAN hesap süzgeçsiz listeden düşürülür, `hiddenAccountIds`) ⇒ satır
// sayıları da sabittir.
//
// 📅 SAAT DONDURULUR (`page.clock`, `accounting-helpers.ts`): ekranın dönemi
// `currentPeriod(new Date())`ten gelir. Dondurulmasaydı gerçek ay geldiğinde
// defter BOŞ iner ve kadraj sessizce ANLAMSIZLAŞIRDI — kimse de fark etmezdi,
// çünkü boş bir tablo da geçerli bir karedir.
//
// ⚠️ Sabit `waitForTimeout` YOKTUR; her bekleme durum tabanlıdır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * Hiçbir kadrajda yükleme metni KALMAZ (WORKFLOW §4, 1. parça). Muhasebe
 * yüzeyleri TEK bir "Yükleniyor…" dizesi kullanmaz (`Yevmiye defteri
 * yükleniyor…` · `Dönem fişleri yükleniyor…` · `Hesap planı yükleniyor…`),
 * bu yüzden hem ortak kalıp hem de her yüzeyin KENDİ işareti ölçülür.
 */
async function expectNoLoadingText(page: Page) {
  await expect(page.getByText(/yükleniyor/i)).toHaveCount(0);
  await expect(page.getByTestId("mu-ledger-loading")).toHaveCount(0);
  await expect(page.getByTestId("mu-drafts-loading")).toHaveCount(0);
  await expect(page.getByTestId("hp-loading")).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// 1) E8 · Yevmiye Defteri — DOLU dönem (Temmuz 2026)
// ---------------------------------------------------------------------------
test("muhasebe yevmiye defteri gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  // `openAccounting` DÖRT yükleme damgasını da bekler (`mu-loaded-summary` ·
  // `-ledger` · `-drafts` · `-accounts`).
  await openAccounting(page);

  await expect(page.getByRole("heading", { level: 1, name: "Muhasebe" })).toBeVisible();

  // 🔴 "YÜKLENDİ" İDDİASI HER BAĞIMSIZ VERİ KAYNAĞINI KAPSAR (WORKFLOW §4,
  // 5. parça). Damga "veri geldi" der, "ekrana bastı" DEMEZ — dört kaynağın
  // da GERÇEK rakamı kadrajda ölçülür.
  //
  // (a) DÖNEM ÖZETİ (`GET /journal-entries/summary`) — üç KPI kartı.
  //     🔴 Net bakiye NEGATİFtir (alacak − borç = −1.022.600) ⇒ kart KIRMIZI
  //     tema alır. Pozitif bir fikstürde bu dal hiç ölçülmezdi.
  await expect(page.getByTestId("mu-kpi-debit")).toContainText("2.842.600");
  await expect(page.getByTestId("mu-kpi-credit")).toContainText("1.820.000");
  await expect(page.getByTestId("mu-kpi-net-value")).toContainText("1.022.600");
  await expect(page.getByTestId("mu-kpi-net-value")).toHaveClass(/mu-kpi__value--danger/);
  // 📅 `page.clock` KANITI: dönem başlığı dondurulmuş takvimden gelir.
  await expect(page.getByTestId("mu-period-label")).toHaveText("Temmuz 2026");

  // (b) DEFTER (`GET /journal`) — devir şeridi + altı SATIR.
  //     🔴 `carried_balance` sıfırdan farklıdır ⇒ şerit BASILIR; sıfır olsaydı
  //     bu yüzey kadrajda hiç görünmezdi.
  const ledger = page.getByRole("region", { name: "Yevmiye Defteri" });
  await expect(page.getByTestId("mu-carried-balance")).toContainText("1.250.000");
  await expect(ledger.locator("tbody tr")).toHaveCount(6);
  // `draft` deftere GİRMEZ, `reversed` GİRER — o satır kadrajda.
  await expect(ledger.getByText("Taşeron Ödemesi – Akın İnşaat")).toBeVisible();
  // E8:113 — ikinci satır serbest metin nottur (iki satırlı hücre kadrajda).
  await expect(ledger.getByText("Ziraat Bank · TRF-20260717")).toBeVisible();

  // (c) DÖNEM FİŞLERİ (`GET /journal-entries`) — BEŞ satır: 2 taslak +
  //     2 kayıtlı + 1 ters kayıtlı ⇒ ÜÇ rozet ve ÜÇ eylem kümesi TEK kadrajda.
  const drafts = page.getByRole("region", { name: "Dönem Fişleri" });
  await expect(drafts.locator('[data-testid^="mu-draft-row-"]')).toHaveCount(5);
  await expect(drafts.getByTestId("mu-draft-row-je-2607-draft-1")).toContainText("Taslak");
  await expect(drafts.getByTestId("mu-draft-row-je-2607-post-1")).toContainText("Kayıtlı");
  await expect(drafts.getByTestId("mu-draft-row-je-2607-rev-1")).toContainText("Ters Kayıtlı");
  // Eylem kümeleri de gerçekten üç FARKLI hâlde (kadrajın asıl konusu).
  await expect(page.getByTestId("mu-draft-post-je-2607-draft-1")).toBeVisible();
  await expect(page.getByTestId("mu-draft-reverse-je-2607-post-1")).toBeVisible();
  await expect(page.getByTestId("mu-draft-reverse-je-2607-rev-1")).toHaveCount(0);

  // (d) HESAP KATALOĞU (`GET /chart-of-accounts`) — süzgecin KENDİ sorgusu.
  //     Yer tutucu + 25 hesap; gelmeden kadraj tek seçenekli bir süzgeç
  //     dondururdu.
  await expect(page.getByTestId("mu-account-filter").locator("option")).toHaveCount(26);
  await expect(page.getByTestId("mu-account-filter")).toContainText("120.01 · Yurtiçi Alıcılar");

  // Devre-dışı "Dışa Aktar" ve gerekçe bandı da kadrajın parçasıdır.
  await expect(page.getByTestId("mu-export")).toBeDisabled();
  await expect(page.getByTestId("mu-export-reason")).toBeVisible();
  await expectNoLoadingText(page);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-yevmiye-defteri.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) HP · Hesap Planı
// ---------------------------------------------------------------------------
test("muhasebe hesap plani gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openChartOfAccounts(page);

  await expect(page.getByRole("heading", { level: 1, name: "Hesap Planı" })).toBeVisible();

  // TEK bağımsız kaynak vardır (`GET /chart-of-accounts`) ve `hp-loaded`
  // damgası onu bekler — ama damga "bastı" demez: tablonun ÜÇ satır türü de
  // gerçekten sayılır (25 hesabın 3'ü grup satırı + 5 sınıf bandı = 30 `tr`).
  const table = page.getByRole("region", { name: "Hesap Planı" });
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await expect(table.locator('[data-testid^="hp-class-"]')).toHaveCount(5);
  await expect(table.locator('[data-testid^="hp-group-"]')).toHaveCount(3);
  await expect(table.locator('tr[data-testid^="hp-row-"]')).toHaveCount(22);

  // Sınıf bantları: üçü mockup'ın çizdiği, ikisi NÖTR YEDEK (K15 — bant
  // etiketi sunucu alanı değildir, `class_code` KODUN ilk hanesidir).
  await expect(page.getByTestId("hp-class-1")).toHaveText("SINIF 1 — DÖNEN VARLIKLAR");
  await expect(page.getByTestId("hp-class-2")).toHaveText("SINIF 2 — DURAN VARLIKLAR");
  await expect(page.getByTestId("hp-class-3")).toHaveText("SINIF 3 — KISA VADELİ YÜKÜMLÜLÜKLER");
  await expect(page.getByTestId("hp-class-6")).toBeVisible();
  await expect(page.getByTestId("hp-class-7")).toBeVisible();

  // Grup satırı (level 1) + level 2 + level 3 — ÜÇ girinti dalı da kadrajda.
  await expect(page.getByTestId("hp-group-10")).toBeVisible();
  await expect(page.getByTestId("hp-row-100")).toBeVisible();
  await expect(page.getByTestId("hp-row-120.01")).toBeVisible();

  // 🔴 HP:155 — TEK negatif bakiye PARANTEZ içindedir (eksi işaretiyle değil).
  await expect(page.getByTestId("hp-balance-257")).toHaveText("(620.000)");
  // 🔴 `Tür` ≠ `Durum`: 108 türü "Aktif" ama noktası GRİ (kullanım dışı).
  await expect(page.getByTestId("hp-type-108")).toHaveText("Aktif");
  await expect(page.getByTestId("hp-status-108")).toHaveAttribute("aria-label", "Kullanım dışı");
  // Dört TÜR rozetinin hepsi tek kadrajda.
  await expect(page.getByTestId("hp-type-257")).toHaveText("Pasif");
  await expect(page.getByTestId("hp-type-600")).toHaveText("Gelir");
  await expect(page.getByTestId("hp-type-760")).toHaveText("Gider");
  // 🔴 YENİ YÜZEY (F-MUF T5): kontra rozeti — tohumda 257 GERÇEK kontra
  // (Birikmiş Amortismanlar), 254/100 kontra DEĞİL.
  await expect(page.getByTestId("hp-contra-257")).toHaveAttribute("aria-label", "Kontra hesap");
  await expect(page.getByTestId("hp-contra-100")).toHaveCount(0);

  // Devre-dışı "Excel" ve gerekçe bandı da kadrajın parçasıdır.
  await expect(page.getByTestId("hp-export")).toBeDisabled();
  await expect(page.getByTestId("hp-export-reason")).toBeVisible();
  await expectNoLoadingText(page);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-hesap-plani.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) E8 · BOŞ dönem (Ocak 2026)
// ---------------------------------------------------------------------------
// 🔴 Boş durum Haziran'da ÖLÇÜLMEZ: orası mutasyon adasıdır ve yazma akışları
// o ayın fiş listesini oynatır. `page.route` ile sahte boş yanıt uydurmaya da
// gerek yoktur — Ocak 2026'da hiçbir fikstür YOKTUR, dolayısıyla boşluk
// SUNUCUNUN kendi yanıtından doğar (paylaşılan mock durumu DEĞİŞMEZ).
test("muhasebe bos donem gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openAccounting(page, ACCOUNTING_EMPTY_TIME);

  // 📅 `page.clock` KANITI: dönem gerçekten boş aya çakılı.
  await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak 2026");

  // Dört kaynak da YÜKLENDİ ve dördü de BOŞLUĞUN kendi yüzeyini bastı:
  // (a) özet — `COALESCE` kanonu: boş ay `0` döner, "—" yer tutucusu DEĞİL.
  await expect(page.getByTestId("mu-kpi-debit")).toContainText("0");
  await expect(page.getByTestId("mu-kpi-net-value")).not.toHaveText("—");
  // Sıfır ne kırmızı ne yeşildir (nötr ton) — dolu kadrajın tersi dal.
  await expect(page.getByTestId("mu-kpi-net-value")).not.toHaveClass(/mu-kpi__value--/);
  // (b) defter — boş durum metni basıldı ve devir şeridi HİÇ basılmadı
  //     (`carried_balance` boş pencerede `0.00`).
  await expect(page.getByTestId("mu-ledger-empty")).toBeVisible();
  await expect(page.getByTestId("mu-carried-balance")).toHaveCount(0);
  // (c) dönem fişleri — kendi boş durumu.
  await expect(page.getByTestId("mu-drafts-empty")).toBeVisible();
  await expect(page.locator('[data-testid^="mu-draft-row-"]')).toHaveCount(0);
  // (d) hesap kataloğu DÖNEM SÜZGEÇLİ DEĞİLDİR — boş ayda bile DOLUdur.
  //     Süzgecin boş inmesi ayrı bir kırıklık olurdu, o yüzden ölçülür.
  await expect(page.getByTestId("mu-account-filter").locator("option")).toHaveCount(26);
  await expectNoLoadingText(page);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-bos-donem.png", { fullPage: true });
});
