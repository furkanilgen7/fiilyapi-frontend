import { test, expect } from "@playwright/test";

// P7 T7 · Şantiye "Hakedişler" sekmesi görsel testi. `e2e/boq-visual.spec.ts`
// deseninin BİREBİR aynısı (`is-kalemleri` sekmesiyle aynı drill-kabuk
// deseni). Değerler `Şantiye - Hakedişler.dc.html` satır 90-113'ten:
// İşveren Hakedişleri kart listesi + ortak KPI şeridi (satır 81-86).
//
// KPI alt başlığı brief'in "ortak KPI şeridi ZORUNLU ucu" notuna göre
// `GET /projects/{project_id}/progress-payments/summary`den `payment_count`
// + `progress_pct` okur — bu uç `e2e/mock-backend.ts`te sunulmazsa alt
// başlık eksik kalır ve baseline yanlış donar (brief'in eklediği belirsizlik
// çözümü).
//
// F-TH T6 GÜNCELLEMESİ (baseline değişikliği — commit e1b6359 "fill
// subcontractor column and margin" bu spec'i BOZAN bir T5 değişikliğiydi):
// bu dosya önceden "Toplam Taşeron Ödemesi"/"Brüt Kar Marjı" kartlarının
// PENDING (henüz veri yok) durumunu doğruluyordu. T5 ile bu kartlar artık
// GERÇEK değer basıyor (sc-1 → s-1 sözleşmesi üzerinden scpp-1..4) —
// `pendingCards`/pending title assert'i KALDIRILDI, yerine gerçek KPI
// değerleri + taşeron panel satırları doğrulanır. Ekran görüntüsü İÇERİĞİ
// bu yüzden DEĞİŞTİ → baseline Linux'ta YENİDEN üretilmeli (rapora bkz.).
//
// Test determinizmi (bkz. `e2e/mock-backend.ts` ·
// `MockSubcontractorProgressPayment.hiddenFromLists`): `scpp-6`/`scpp-7` —
// `e2e/subcontractor-progress-payments.spec.ts`in mutasyona uğrattığı taze
// taslaklar — liste/özet uçlarından TAMAMEN dışlanır; bu ekran artık o
// fonksiyonel spec'in ne zaman/hangi sırada koştuğundan (fullyParallel)
// yapısal olarak bağımsızdır. İşveren tarafı için AYNI izolasyon `pp-6`
// (`e2e/progress-payments.spec.ts`) ile zaten sağlanıyordu.
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı
// gereği tüm yazma yüzeyleri ("+ Hakediş Oluştur") GÖRÜNÜR hâlde baseline'a
// girer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("santiye hakedisler sekmesi ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/s-1/hakedisler");
  await expect(page.getByRole("heading", { name: "A-Blok Şantiyesi — Hakedişler" })).toBeVisible();
  // İçerik yüklendi: liste satırı + KPI alt başlığı (proje bağlamlı özet
  // ucundan) basılı olmadan ekran görüntüsü alınırsa baseline yükleme
  // durumunu dondurur.
  await expect(page.getByText("Kat 6–8 döşeme")).toBeVisible();
  await expect(page.getByTestId("pp-kpi-subtitle")).toHaveText("5 hakediş · %75");
  // Taşeron KPI'ları artık GERÇEK (F-TH T5) — pending DEĞİL: "Toplam Taşeron
  // Ödemesi" (sc-1'in s-1'e bağlı scpp-1..4 toplamı) + "Brüt Kar Marjı".
  await expect(page.getByTestId("pp-kpi-subcontractor-subtitle")).toHaveText("1 taşeron");
  await expect(page.getByText("₺ 141,4B")).toBeVisible();
  // Taşeron kartı — dört durumun hepsi kadrajda (Ödendi/Onaylandı/Onay
  // Bekliyor/Revize Gerekli), sc-1'in gerçek `work_category`si ("Elektrik").
  await expect(page.getByText("Aydın Elektrik Taah. #4")).toBeVisible();
  await expect(page.getByText("Revize Gerekli")).toBeVisible();
  // F-P5 baseline turu bulgusu — NÜKSÜ ENGELLEYEN İDDİA: yukarıdaki yorum
  // "Elektrik"ten söz ediyordu ama HİÇBİR iddia onu kilitlemiyordu. TB3 ile
  // `work_category` hakediş LİSTE şemasına eklendi ve T1'de U1 join'i
  // söküldü; `e2e/mock-backend.ts` alanı basmayı unutunca kategori SESSİZCE
  // kayboldu ("Elektrik · Tüm Bölümler" → "· Tüm Bölümler") ve bunu yalnız
  // baseline turu yakaladı — dört kapı da 5. kapı da GÖRMEDİ.
  await expect(page.getByText("Elektrik · Tüm Bölümler").first()).toBeVisible();
  await expect(page).toHaveScreenshot("santiye-hakedisler.png", { fullPage: true });
});
