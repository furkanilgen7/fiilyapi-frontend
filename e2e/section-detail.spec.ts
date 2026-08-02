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
  // GERÇEK; İlerleme/İşçi/İş Kalemleri yer tutucu (task-2-brief §KPI).
  await expect(page.getByTestId("section-hero-kpi-budget")).toContainText("₺");
  await expect(page.getByTestId("section-hero-kpi-progress").locator(".section-hero__kpi-value--pending")).toHaveCount(1);
  await expect(page.getByTestId("section-hero-kpi-worker").locator(".section-hero__kpi-value--pending")).toHaveCount(1);
  await expect(page.getByTestId("section-hero-kpi-boq").locator(".section-hero__kpi-value--pending")).toHaveCount(1);
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

  // 5) Sekme geçişi (D99-105): varsayılan "İş Kalemleri" pending kartı; başka
  // bir sekmeye geçince panel içeriği değişir, sekme geri seçilebilir.
  await expect(page.getByText("İş Kalemleri — bu bölümde henüz görüntülenemiyor")).toBeVisible();
  await page.getByRole("tab", { name: "İşçiler & Puantaj" }).click();
  await expect(page.getByText("İşçiler & Puantaj — bu bölümde henüz görüntülenemiyor")).toBeVisible();
  await page.getByRole("tab", { name: "İş Kalemleri" }).click();
  await expect(page.getByText("İş Kalemleri — bu bölümde henüz görüntülenemiyor")).toBeVisible();

  // 6) Alt satır kartları (D215-272) — pending, ama gerçek navigasyona açık.
  await expect(page.getByText("Bu Bölümdeki İşçiler", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Puantaj →" })).toHaveAttribute(
    "href",
    "/projeler/p-1/santiyeler/s-1/puantaj",
  );
  await expect(page.getByText("Bölüm Malzeme Durumu")).toBeVisible();
  await expect(page.getByRole("link", { name: "Tümü →" })).toHaveAttribute(
    "href",
    "/projeler/p-1/santiyeler/s-1/stok",
  );
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
