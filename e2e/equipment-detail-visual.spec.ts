import { test, expect } from "@playwright/test";

import { EQUIPMENT_URL, visualLogin } from "./equipment-helpers";
import { prepareFrame } from "./visual-scroll";

// F-MKD · Ekipman Detay görsel testleri (`Makine - Ekipman Detay.dc.html`).
//
// SALT-OKUR: hiçbir POST/PATCH tetiklemez → `fullyParallel` altında yarış YOK.
//
// 📅 TARİH BAĞIMSIZ ve `page.clock` GEREKMEZ: ekranın dönemi ile belge
// geçerlilik rozetlerinin tabanı SUNUCUNUN `as_of` damgasıdır
// (`GET /equipment/{id}/detail`) ve ikiz onu 2026-08-20'ye SABİTLER. İstemci
// saatinden türeseydi "21 gün kaldı" rozeti her gün başka bir sayı basar ve
// kare her koşuda oynardı.
//
// 🔴 "YÜKLENDİ" İDDİASI HER BAĞIMSIZ KAYNAĞI KAPSAR (F-İK dersi): bu ekranın
// YEDİ ayrı sorgusu var (detay · şantiye seçenekleri · çalışma özeti ×3 ·
// yakıt özeti · belgeler · tedarikçi · kira hakedişleri). Tek bayrakla
// beklemek, ikinci kaynağın "Yükleniyor…" hâlini kadraja DONDURURDU.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const LOADING_TEXT = "Yükleniyor…";

async function waitForDetailSources(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("makine-det-loaded-detail")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-sites")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-work-0")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-work-1")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-work-2")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-fuel")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-documents")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-supplier")).toHaveCount(1);
  await expect(page.getByTestId("makine-det-loaded-invoices")).toHaveCount(1);
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);
}

test("ekipman detay gorsel (kendi malimiz — bakim cubugu DOLU)", async ({ page }) => {
  await visualLogin(page);
  await page.goto(`${EQUIPMENT_URL}/eq-1`);
  await expect(page.getByRole("heading", { level: 1, name: "Tower Crane TC-48" })).toBeVisible();
  await waitForDetailSources(page);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-detay.png", { fullPage: true });
});

test("ekipman detay gorsel (kiralik — bakim penceresi YOK, belge rozetleri)", async ({ page }) => {
  await visualLogin(page);
  await page.goto(`${EQUIPMENT_URL}/eq-3`);
  await expect(page.getByRole("heading", { level: 1, name: "Damperli Kamyon FMX" })).toBeVisible();
  await waitForDetailSources(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-detay-kiralik.png", { fullPage: true });
});
