import { test, expect } from "@playwright/test";

import { TREASURY_URL, visualLogin } from "./treasury-helpers";
import { prepareFrame } from "./visual-scroll";

// F-HZ T3.2 · Hazine (E9) görsel testi — `equipment-visual.spec.ts`
// deseninin aynısı.
//
// SALT-OKUR: bu dosya hiçbir POST/PATCH tetiklemez, yalnız fikstürleri render
// eder; hazine uçlarının üçü de GET'tir → `fullyParallel` altında yarış
// YOKTUR.
//
// 📅 TARİH BAĞIMSIZ: `/hazine` istemci saatine HİÇ dokunmaz (kod okunarak
// doğrulandı) — dönem başlığı `CashFlowResponse.year/month` ECHO'sundan,
// "(7 Gün)" başlığı `days` echo'sundan, "N gün kaldı" `days_remaining`ten
// gelir; `due_date` STRING ayrıştırılır (`formatDayMonth`, `new Date` YOK) ve
// grafik ekseni `daysInMonth`ta `Date.UTC` kullanır. Fikstür bu alanların
// hepsini SABİT verdiği için kare makinenin takvimine bağlı DEĞİLDİR →
// `page.clock` gerekmez.
//
// 📐 KESİRLİ KOORDİNAT YOK (GÖRSEL SPEC KURALI 4. parça, F-P8 kanonu):
// `cash-flow-geometry.ts`teki `scaleX`/`scaleY` üretilen HER koordinatı
// `Math.round`lar ve `CashFlowPanel.test.tsx` basılan `d` dizesinde kesirli
// sayı olmadığını iddia eder — SVG yolları yarım piksele oturmaz.
//
// 🔴 "YÜKLENDİ" İDDİASI HER BAĞIMSIZ VERİ KAYNAĞINI KAPSAR (WORKFLOW §4, 5.
// parça · F-İK dersi): bu ekranın ÜÇ AYRI sorgusu vardır (`/bank-accounts`,
// `/treasury/cash-flow`, `/treasury/upcoming-payments`) ve her biri KENDİ
// yükleme durumunu taşır — biri çözülürken öbürü hâlâ "Yükleniyor…" basar.
// Tek bayrakla beklemek o pending hâli kadraja DONDURABİLİRDİ ve bozuk kare
// sessizce commit'lenirdi. Üç kaynak için AYRI iddia yazılır + hiçbir yerde
// "Yükleniyor…" kalmadığı doğrulanır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const LOADING_TEXT = "Yükleniyor…";

test("hazine ekrani gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto(TREASURY_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Hazine" })).toBeVisible();

  // YERLEŞİM OTURDU — ÜÇ bağımsız kaynak, ÜÇ ayrı iddia:
  // (a) banka/kasa hesapları (`GET /bank-accounts`) — GERÇEK bakiye görünür
  await expect(page.getByTestId("hazine-loaded-accounts")).toHaveCount(1);
  await expect(page.getByTestId("hazine-account-card")).toHaveCount(3);
  await expect(page.getByTestId("hazine-cards")).toContainText("₺ 2.840.500");
  // (b) nakit akışı (`GET /treasury/cash-flow`) — efsane şeridi "—" DEĞİL,
  //     başlık da sunucunun dönem echo'sunu basıyor
  await expect(page.getByTestId("hazine-loaded-cashflow")).toHaveCount(1);
  await expect(page.getByTestId("hazine-cashflow-chart")).toBeVisible();
  await expect(page.getByTestId("hazine-cashflow-panel")).toContainText("Temmuz Nakit Akışı");
  await expect(page.getByTestId("hazine-cashflow-panel")).toContainText("Giriş ₺4,12M");
  // (c) yaklaşan ödemeler (`GET /treasury/upcoming-payments`) — GERÇEK satır
  await expect(page.getByTestId("hazine-loaded-upcoming")).toHaveCount(1);
  await expect(page.getByTestId("hazine-upcoming-row")).toHaveCount(4);
  await expect(page.getByTestId("hazine-upcoming-panel")).toContainText(
    "Akın İnşaat – Hakediş #47",
  );
  // Hiçbir kaynak pending kalmadı.
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("hazine.png", { fullPage: true });
});
