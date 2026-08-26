import { test, expect } from "@playwright/test";

// F-P6 T4 · Bölüm Detay e2e — READ-ONLY (hiçbir POST/PATCH tetiklemez).
// `mock-backend.ts` sec-1 (A-Blok Şantiyesi altında, TÜM P6 alanları dolu,
// `is_draft: false`) ve sec-3 (taslak + `on_hold`, çoğu alan null) kayıtlarını
// kullanır — ikisi de `site-detail-visual.spec.ts` ve
// `section-detail-visual.spec.ts` ile PAYLAŞILAN sabit fikstürlerdir ama bu
// dosya hiçbir mutasyon yapmadığı için (yalnız GET) o baseline'larla YARIŞMAZ.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("santiye detayindan bolum detayina link, hero + KPI + sekmeler + Hakedis Olustur linki", async ({
  page,
}) => {
  await login(page);

  // 1) Zincirin ilk halkası: Şantiye Detay'daki SectionCard "Detay →" linkinden
  // GERÇEK navigasyonla bölüm detayına gidilir (page.goto DEĞİL) — SectionCard →
  // Bölüm Detay bağlantısının kopuk olmadığının kanıtı.
  await page.goto("/projeler/p-1/santiyeler/s-1");
  await expect(page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi" })).toBeVisible();
  const secCard = page.getByTestId("section-list").locator("li", { hasText: "Kat 6–10 Kaba İnşaat" });
  await secCard.getByRole("link", { name: "Detay →" }).click();
  await expect(page).toHaveURL(/\/santiyeler\/s-1\/bolumler\/sec-1$/);

  // 2) Hero alanları (D54-96): başlık, durum rozeti, meta satırı.
  await expect(page.getByRole("heading", { level: 1, name: "Kat 6–10 Kaba İnşaat" })).toBeVisible();
  await expect(page.getByText("Aktif", { exact: true })).toBeVisible();
  // Düzeltme turu 2 (final review C1): "A-Blok Şantiyesi" hem hero meta
  // satırında (D62) HEM DE DrillSidebar'ın `.drill-group__label`'ında
  // (project-nav-config.ts:83, activeSiteGroup heading) basılıyor —
  // kapsamsız `getByText` strict-mode ihlali verirdi (section-form.spec.ts'te
  // `.field__error` ile kapatılan aynı sınıf hata). Assert'i hero meta
  // satırına SCOPE ediyoruz.
  await expect(page.locator(".section-hero__meta")).toContainText("A-Blok Şantiyesi");
  await expect(page.getByText("Sorumlu: Sercan Öztürk")).toBeVisible();

  // 3) KPI ayrımı — Bölüm Bedeli (budget_amount) VE Kalan Gün (end_date türevi)
  // GERÇEK; İlerleme/İşçi yer tutucu (task-2-brief §KPI).
  //
  // 🔴 F-BLMKART (2026-08-27) GÜNCELLEMESİ: "İş Kalemleri" ARTIK YER TUTUCU
  // DEĞİLDİR. Backend BLM-SAY (`1def2b9`) `boq_item_count`u BOQ tahsislerinden
  // türetti ve `to_section_detail` zarfları `to_section`ten AYNEN devraldığı
  // için DETAY ekranı da gerçek sayıyı alır. Eski satır ("boq hâlâ pending")
  // artık CANLIYI YALANLAYAN bir bekçiydi; ikiz düzeltildi ve bu satır onunla
  // birlikte güncellendi. sec-1'e üç poz tahsis edilmiştir (bkz. `BOQ_FIXTURE`).
  await expect(page.getByTestId("section-hero-kpi-budget")).toContainText("₺");
  await expect(page.getByTestId("section-hero-kpi-progress").locator(".section-hero__kpi-value--pending")).toHaveCount(1);
  await expect(page.getByTestId("section-hero-kpi-worker").locator(".section-hero__kpi-value--pending")).toHaveCount(1);
  await expect(page.getByTestId("section-hero-kpi-boq").locator(".section-hero__kpi-value--pending")).toHaveCount(0);
  await expect(page.getByTestId("section-hero-kpi-boq")).toContainText("3");
  await expect(page.getByTestId("section-hero-kpi-days").locator(".section-hero__kpi-value--pending")).toHaveCount(0);

  // 4) Eylemler: "Düzenle" doğru rotaya, "Hakediş Oluştur" P7 ekranına gider.
  await expect(page.getByRole("link", { name: "Düzenle" })).toHaveAttribute(
    "href",
    "/projeler/p-1/santiyeler/s-1/bolumler/sec-1/duzenle",
  );
  await expect(page.getByRole("link", { name: "Hakediş Oluştur" })).toHaveAttribute(
    "href",
    "/hakedisler/yeni?project=p-1",
  );

  // 5) Sekme geçişi (D99-105): 🔴 BOQ-SEC-F'ten sonra varsayılan "İş Kalemleri"
  // sekmesi GERÇEK tablodur, pending kartı değil; öbür sekmeler pending kalır.
  await expect(page.getByText("İş Kalemleri — Kat 6–10 Kaba İnşaat")).toBeVisible();
  await page.getByRole("tab", { name: "İşçiler & Puantaj" }).click();
  await expect(page.getByText("İşçiler & Puantaj — bu bölümde henüz görüntülenemiyor")).toBeVisible();
  await page.getByRole("tab", { name: "İş Kalemleri" }).click();
  await expect(page.getByTestId("section-boq-row")).toHaveCount(3);

  // 6) Alt satır kartları (D215-272) — pending, ama gerçek navigasyona açık.
  // 🔴 F-BOLLINK: "Puantaj →" artık BÖLÜM SÜZGECİNİ taşır (hedef ekran
  // `?section=` okur); "Tümü →" taşımaz (stok ekranı okumuyor — ölü parametre).
  await expect(page.getByText("Bu Bölümdeki İşçiler", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Puantaj →" })).toHaveAttribute(
    "href",
    "/projeler/p-1/santiyeler/s-1/puantaj?section=sec-1",
  );
  await expect(page.getByText("Bölüm Malzeme Durumu")).toBeVisible();
  await expect(page.getByRole("link", { name: "Tümü →" })).toHaveAttribute(
    "href",
    "/projeler/p-1/santiyeler/s-1/stok",
  );
});

test("bolum detayindaki 'Puantaj →' baglantisi bolum suzgecli puantaj ekranini acar", async ({
  page,
}) => {
  await login(page);
  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-1");
  await page.getByRole("link", { name: "Puantaj →" }).click();
  // Bağlantı bölümü UNUTMUYOR: URL süzgeci taşır ve hedef ekran onu OKUR.
  await expect(page).toHaveURL(/\/santiyeler\/s-1\/puantaj\?section=sec-1$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Puantaj");
});

test("taslak + beklemede bolum: durum rozeti ve bos alanlarda durust yer tutucu", async ({ page }) => {
  await login(page);

  // sec-3: taslak + on_hold, section_type/manager/tarih/butce hepsi null —
  // §4 zorunluluk kuralinin YALNIZ is_draft:false iken uygulandigini kanitlayan
  // kayit (bkz. e2e/mock-backend.ts). Dogrudan URL ile gidiliyor (READ-ONLY).
  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-3");
  await expect(page.getByRole("heading", { level: 1, name: "Peyzaj Düzenlemesi (Taslak)" })).toBeVisible();
  await expect(page.getByText("Beklemede", { exact: true })).toBeVisible();

  // Bölüm Bedeli null → durust "—" (yer tutucu DEGIL, gercek eksiklik).
  await expect(page.getByTestId("section-hero-kpi-budget")).toContainText("—");
  // Kalan Gün: end_date null → durust "—".
  await expect(page.getByTestId("section-hero-kpi-days")).toContainText("—");
});


/**
 * BOQ-SEC-F T7 — bölüm detayı · İş Kalemleri sekmesi (bölüm süzgeçli BOQ).
 *
 * 🔴 Bu spec'in ASIL işi, ucun "200 + DOLU gövde" döndüğünü DOĞRUDAN ölçmektir.
 * Sahte backend'de `?section_id=` okunmasaydı ekran şantiyenin BÜTÜN pozlarını
 * basardı ve naif bir test yine yeşil geçerdi (F-TKV M11 kanonu).
 */
test("bolum detayi Is Kalemleri sekmesi BOLUM SUZGECLI veriyi basar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-1");
  await expect(page.getByRole("heading", { level: 1, name: "Kat 6–10 Kaba İnşaat" })).toBeVisible();

  // (a) SÜZGEÇ İŞLİYOR: şantiyede 6 poz var, bu bölüme yalnız 3'ü tahsisli.
  await expect(page.getByTestId("section-boq-row")).toHaveCount(3);
  // Tahsisi olmayan poz EKRANDA OLMAMALI — süzgeç okunmasaydı görünürdü.
  await expect(page.getByText("Geri Dolgu ve Sıkıştırma")).toHaveCount(0);
  await expect(page.getByText("Tuğla Duvar (19cm)")).toHaveCount(0);

  // (b) BOŞALAN GRUP DÜŞER: "DUVAR VE KAPLAMA İŞLERİ" grubunun bu bölümde hiç
  // kalemi yok → başlığı da basılmaz (boş başlık dizisi yazılmaz).
  await expect(page.getByTestId("section-boq-group")).toHaveCount(2);
  await expect(page.getByTestId("section-boq-group").first()).toHaveText(
    "A. TOPRAK VE TEMEL İŞLERİ",
  );

  // (c) 🔴 K2 — MİKTAR SÜTUNU BÖLÜM PAYIDIR, poz kotası DEĞİL.
  // "C25/30 Beton (Döşeme)" şantiye kotası 3.200; bu bölümün payı 1.200.
  const quantities = page.getByTestId("section-boq-quantity");
  await expect(quantities.nth(1)).toHaveText("1.200");
  await expect(page.getByText("3.200", { exact: true })).toHaveCount(0);

  // (d) Toplam da maskelenmiş miktardan türer: 112.000 + 2.220.000 + 1.572.500.
  await expect(page.getByTestId("section-boq-total-amount")).toContainText("3.904.500");
  await expect(page.getByText("BÖLÜM TOPLAM (3 kalem)")).toBeVisible();

  // (e) K1 — poz seçici YOK: "+ Kalem Ekle" silinmedi, GEREKÇELİ devre dışı.
  await expect(page.getByRole("button", { name: "+ Kalem Ekle" })).toBeDisabled();
  await expect(page.getByText(/Poz seçme ekranı henüz tasarlanmadı/)).toBeVisible();

  // (f) Backend'de karşılığı olmayan iki sütun sahte veriyle DOLDURULMAZ.
  await expect(page.getByTestId("section-boq-status").first()).toHaveText(/^—/);
  await expect(page.getByTestId("section-boq-pct").first()).toHaveText(/^—/);
});

test("hic tahsisi olmayan bolumde durust bos durum basilir", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  // sec-3 ("Peyzaj Düzenlemesi") hiçbir pozdan pay almadı.
  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-3");
  await expect(page.getByTestId("section-boq-empty")).toBeVisible();
  await expect(page.getByText("Bu bölüme henüz iş kalemi atanmadı.")).toBeVisible();
  await expect(page.getByText(/^0 kalem ·/)).toBeVisible();
});
