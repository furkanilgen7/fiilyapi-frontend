import { test, expect } from "@playwright/test";

import {
  EQUIPMENT_FUEL_URL,
  EQUIPMENT_NEW_URL,
  EQUIPMENT_URL,
  EQUIPMENT_WORK_URL,
  visualLogin,
} from "./equipment-helpers";
import { prepareFrame } from "./visual-scroll";

// F-MK T5b · Makine & Ekipman görsel testleri (M1 · M2 · M3 · M4) —
// `stock-catalog-visual.spec.ts` / `hr-documents-visual.spec.ts` deseninin
// aynısı.
//
// SALT-OKUR: bu dosya hiçbir POST/PATCH tetiklemez, yalnız fikstürleri render
// eder. Ekipman kayıtlarının PROJE KAPSAMI YOKTUR (T5b kuralı): başarılı bir
// yazma kart ızgarasını/KPI sayaçlarını değiştirip bu baseline'ları sessizce
// kırardı — bu yüzden F-MK'nın yazma testi (`equipment-form.spec.ts`) isteği
// BFF katmanında karşılar ve mock durumuna hiç dokunmaz → `fullyParallel`
// altında yarış YOKTUR.
//
// 📅 TARİH BAĞIMSIZ: `/makine/calisma` ve `/makine/yakit` dönemi URL'den okur
// ve parametresiz hâlde İÇİNDE BULUNULAN AYA düşer (`parsePeriod`); iki kadraj
// da dönemi AÇIKÇA taşır (`?year=2026&month=8`), böylece kare makinenin
// takvimine bağlı olmaz. M1/M2'de tarihe bağlı türev yoktur (durum/rozet/
// sayaçların hepsi SUNUCU damgasıdır) — `page.clock` gerekmez.
//
// 🔴 "YÜKLENDİ" İDDİASI HER BAĞIMSIZ VERİ KAYNAĞINI KAPSAR (WORKFLOW §4, 5.
// parça · F-İK dersi): bu dört ekranın HİÇBİRİ tek sorgudan beslenmiyor ve
// `EquipmentResponse`/`WorkLogResponse`/`FuelLogResponse` yalnız UUID taşıyor
// (ad AYRI sorgudan çözülüyor). Tek bayrakla beklemek, ikinci kaynağın
// "Yükleniyor…" hâlini kadraja DONDURABİLİRDİ ve o bozuk kare sessizce
// commit'lenirdi. Her kaynak için AYRI iddia yazılır + hiçbir yerde
// "Yükleniyor…" kalmadığı doğrulanır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const LOADING_TEXT = "Yükleniyor…";

test("makine ekipman listesi gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto(EQUIPMENT_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Makine & Ekipman" })).toBeVisible();

  // YERLEŞİM OTURDU — DÖRT bağımsız kaynak, DÖRT ayrı iddia:
  // (a) ekipman listesi (`GET /equipment`)
  await expect(page.getByTestId("makine-loaded-equipment")).toHaveCount(1);
  await expect(page.getByTestId("makine-card")).toHaveCount(5);
  // (b) durum özeti (`GET /equipment/summary`) — sahte "—" GERÇEK sayıya döndü
  await expect(page.getByTestId("makine-loaded-summary")).toHaveCount(1);
  await expect(page.getByTestId("makine-kpi-strip")).toContainText("₺ 144,2B");
  // (c) şantiye seçenekleri (`/projects` + `/projects/{id}/sites`) — kart
  //     meta satırı `site_id`yi ADA çevirdi
  await expect(page.getByTestId("makine-loaded-sites")).toHaveCount(1);
  await expect(page.locator('[data-equipment-id="eq-1"]')).toContainText(
    "Kule A A-Blok Şantiyesi",
  );
  // (d) personel listesi (`GET /personnel`) — operatör hücresi ADA çevrildi
  await expect(page.getByTestId("makine-loaded-personnel")).toHaveCount(1);
  await expect(page.locator('[data-equipment-id="eq-1"]')).toContainText("Mehmet Kılıç");
  // Hiçbir kaynak pending kalmadı.
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-listesi.png", { fullPage: true });
});

test("makine ekipman formu gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto(EQUIPMENT_NEW_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Yeni Makine / Ekipman" })).toBeVisible();

  // YERLEŞİM OTURDU — formun ÜÇ seçicisi ÜÇ ayrı sorgudan beslenir ve her biri
  // yüklenirken altındaki not "Yükleniyor…" basar; üçü için AYRI iddia:
  await expect(page.getByTestId("equipment-form-body")).toBeVisible();
  // (a) şantiye seçenekleri → not artık K6 gerekçesini basıyor
  await expect(page.getByTestId("makine-form-loaded-sites")).toHaveCount(1);
  await expect(page.getByTestId("equipment-form-body")).toContainText(
    "Ekipman ŞANTİYEYE atanır",
  );
  // (b) personel (operatör) seçenekleri → not mockup'ın kendi ipucuna döndü
  await expect(page.getByTestId("makine-form-loaded-personnel")).toHaveCount(1);
  await expect(page.getByTestId("equipment-form-body")).toContainText(
    "Operatör belgesi kontrol edilir",
  );
  // (c) tedarikçi seçenekleri → not MK-1 K3 gerekçesini basıyor
  await expect(page.getByTestId("makine-form-loaded-suppliers")).toHaveCount(1);
  await expect(page.getByTestId("equipment-form-body")).toContainText(
    "Satıcı ve kiralama firması TEK tedarikçi kaydıdır",
  );
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-form.png", { fullPage: true });
});

test("makine calisma kaydi gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto(EQUIPMENT_WORK_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Çalışma Kaydı" })).toBeVisible();

  // YERLEŞİM OTURDU — ALTI bağımsız kaynak, ALTI ayrı iddia:
  // (a) çalışma özeti (tablo + tfoot + haftalık grafik)
  await expect(page.getByTestId("makine-cal-loaded-summary")).toHaveCount(1);
  await expect(page.getByTestId("makine-cal-summary-row")).toHaveCount(4);
  await expect(page.getByTestId("makine-cal-summary-totals")).toContainText("₺ 124.800");
  // (b) son kayıtlar (`GET /equipment/work-logs`)
  await expect(page.getByTestId("makine-cal-loaded-logs")).toHaveCount(1);
  await expect(page.getByTestId("makine-cal-recent-item")).toHaveCount(4);
  // (c) yakıt özeti — BEŞİNCİ KPI kartının AYRI ucu
  await expect(page.getByTestId("makine-cal-loaded-fuel")).toHaveCount(1);
  await expect(page.getByTestId("makine-cal-kpi-fuel")).toContainText("2.840 Lt");
  // (d) şantiye seçenekleri — tablo/kayıt meta satırları ADA çevrildi
  await expect(page.getByTestId("makine-cal-loaded-sites")).toHaveCount(1);
  await expect(page.getByTestId("makine-cal-summary-table")).toContainText(
    "Kule A A-Blok Şantiyesi",
  );
  // (e) ekipman listesi — kayıt satırı yalnız UUID taşır, ADI buradan gelir
  await expect(page.getByTestId("makine-cal-recent")).toContainText("Tower Crane TC-48");
  // (f) personel listesi — operatör adı da AYRI sorgudan çözülür
  await expect(page.getByTestId("makine-cal-recent")).toContainText("Operatör: Mehmet Kılıç");
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-calisma.png", { fullPage: true });
});

test("makine yakit takibi gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto(EQUIPMENT_FUEL_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Yakıt Takibi" })).toBeVisible();

  // YERLEŞİM OTURDU — BEŞ bağımsız kaynak, BEŞ ayrı iddia:
  // (a) yakıt özeti (KPI şeridi + tüketim listesi)
  await expect(page.getByTestId("makine-yakit-loaded-summary")).toHaveCount(1);
  await expect(page.getByTestId("makine-yakit-kpi")).toContainText("2.840 Lt");
  await expect(page.getByTestId("makine-yakit-consumption-row")).toHaveCount(3);
  // (b) günlük kayıt tablosu (`GET /equipment/fuel-logs`)
  await expect(page.getByTestId("makine-yakit-loaded-logs")).toHaveCount(1);
  await expect(page.getByTestId("makine-yakit-log-row")).toHaveCount(3);
  // (c) ekipman listesi — tablo ADI ve tüketim listesinin NORM BİRİMİ buradan
  await expect(page.getByTestId("makine-yakit-loaded-equipment")).toHaveCount(1);
  await expect(page.getByTestId("makine-yakit-consumption-list")).toContainText("Lt/saat");
  // (d) şantiye seçenekleri — "Proje" sütunu ADA çevrildi
  await expect(page.getByTestId("makine-yakit-loaded-sites")).toHaveCount(1);
  await expect(page.getByTestId("makine-yakit-log-table")).toContainText(
    "Kule A A-Blok Şantiyesi",
  );
  // (e) kullanıcı seçenekleri — "Giren" sütunu ADA çevrildi
  await expect(page.getByTestId("makine-yakit-loaded-users")).toHaveCount(1);
  await expect(page.getByTestId("makine-yakit-log-table")).toContainText("Ahmet Yılmaz (Patron)");
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-yakit.png", { fullPage: true });
});
