import { test, expect, type Page } from "@playwright/test";

// F-ST T1 · Stok & Depo ALTYAPI e2e'si (ekran DEĞİL — ekranlar T2/T3/T4).
// `documents-api.spec.ts` deseninin aynısı.
//
// Neden UI'sız: bu dilimde basılan tek şey BFF kökleri + hook + mock
// katmanıdır ve buradaki iki davranış jsdom'da KANITLANAMAZ:
//   1. `stock` ve `warehouses` köklerinin BFF izin listesinden gerçekten
//      geçmesi (kök düşerse YALNIZ CANLIDA 404 — jsdom testleri görmez),
//   2. bakiye/durumun SUNUCUDAN gelmesi (istemci hiçbir yerde hesaplamaz).
// İstekler `page.request` ile atılır: giriş sonrası httpOnly oturum çerezi
// aynı bağlamdan taşınır, token URL'e KONMAZ.
//
// 🔒 FİKSTÜR İZOLASYONU (P7/F-PL/F-BC dersi): mock backend TÜM spec'lerde TEK
// paylaşılan sunucudur ve stok kayıtlarının PROJE KAPSAMI YOKTUR — belge
// arşivindeki "p-2'de yaz" kaçışı burada MÜMKÜN DEĞİL. Başarılı bir yazma
// katalog tablosuna satır ekler ya da bakiyeyi değiştirir ve T2/T3'ün görsel
// baseline'larını sessizce kırar. Bu yüzden bu dosya YALNIZ okur ve yazma
// tarafında REDDEDİLEN (durum değiştirmeyen) gövdeleri kanıtlar. Başarılı
// yazmanın uçtan uca kanıtı kapanış smoke'unda CANLI ortamda alınır.
const SITE_ID = "s-1";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

interface SummaryRow {
  id: string;
  code: string;
  balance: string;
  min_stock: string | null;
  status: string | null;
  last_unit_price: string | null;
  warehouses: Array<{ warehouse_id: string; warehouse_name: string; site_id: string | null }>;
}

test.describe("stok altyapısı (salt-okur)", () => {
  test("stock kökü BFF'ten geçer; katalog özeti bakiye+durumu SUNUCUDAN taşır", async ({
    page,
  }) => {
    await login(page);

    const response = await page.request.get("/api/backend/stock/summary?limit=200");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { items: SummaryRow[]; total: number };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.total).toBe(body.items.length);

    // Durum formülü SUNUCUDADIR: dört rozetin hepsi fikstürde temsil edilir.
    const statuses = new Set(body.items.map((row) => row.status));
    expect(statuses).toContain("critical");
    expect(statuses).toContain("low");
    expect(statuses).toContain("normal");
    expect(statuses).toContain("excess");

    // Eşiksiz kart: `min_stock` yoksa durum UYDURULMAZ (ekran "—" basar).
    const withoutThreshold = body.items.filter((row) => row.min_stock === null);
    expect(withoutThreshold.length).toBeGreaterThan(0);
    expect(withoutThreshold.every((row) => row.status === null)).toBe(true);
  });

  test("durum süzgeci sunucuda uygulanır; KPI'lar SÜZÜLEN kümenin özetidir", async ({ page }) => {
    await login(page);

    const all = await page.request.get("/api/backend/stock/summary?limit=200");
    const critical = await page.request.get("/api/backend/stock/summary?status=critical&limit=200");

    expect(critical.status()).toBe(200);
    const allBody = (await all.json()) as { items: SummaryRow[]; kpis: { critical_count: number } };
    const criticalBody = (await critical.json()) as {
      items: SummaryRow[];
      kpis: { critical_count: number; total_items: number };
    };

    expect(criticalBody.items.every((row) => row.status === "critical")).toBe(true);
    expect(criticalBody.items.length).toBeLessThan(allBody.items.length);
    // KPI sayfanın değil SÜZÜLEN kümenin özetidir.
    expect(criticalBody.kpis.total_items).toBe(criticalBody.items.length);
    expect(criticalBody.kpis.critical_count).toBe(allBody.kpis.critical_count);
  });

  test("warehouses kökü BFF'ten geçer; merkez depo site_id NULL taşır", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/warehouses?limit=200");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      items: Array<{ id: string; name: string; site_id: string | null }>;
      total: number;
    };
    expect(body.items.length).toBeGreaterThan(0);
    // Merkez depo (şantiyesiz) VARDIR — SG formunun kaynak/hedef seçicisi ona
    // dayanır ve `site_id` yokluğu kimlik eksikliği DEĞİL, merkez demektir.
    expect(body.items.some((w) => w.site_id === null)).toBe(true);
    expect(body.items.some((w) => w.site_id !== null)).toBe(true);
  });

  test("şantiye stok tablosu 'sites' kökünden geçer; merkez depo bakiyesi SIZMAZ", async ({
    page,
  }) => {
    await login(page);

    const warehouses = await page.request.get("/api/backend/warehouses?limit=200");
    const centralIds = new Set(
      ((await warehouses.json()).items as Array<{ id: string; site_id: string | null }>)
        .filter((w) => w.site_id === null)
        .map((w) => w.id),
    );

    const response = await page.request.get(`/api/backend/sites/${SITE_ID}/stock?limit=200`);

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      items: Array<{ id: string; balance: string; monthly_need: { available: boolean } }>;
      kpis: { total_items: number };
    };
    expect(body.items.length).toBeGreaterThan(0);
    expect(centralIds.size).toBeGreaterThan(0);

    // Şantiye tablosu YALNIZ o şantiyenin depolarını toplar: E3 genel katalogda
    // görünen ama başka şantiyenin deposunda duran kalem burada YOKTUR.
    const globalRows = (await (
      await page.request.get("/api/backend/stock/summary?limit=200")
    ).json()) as { items: SummaryRow[] };
    const otherSiteOnly = globalRows.items.filter(
      (row) =>
        row.warehouses.length > 0 && row.warehouses.every((w) => w.site_id !== SITE_ID),
    );
    expect(otherSiteOnly.length).toBeGreaterThan(0);
    const siteIds = new Set(body.items.map((row) => row.id));
    expect(otherSiteOnly.every((row) => !siteIds.has(row.id))).toBe(true);

    // "Aylık İhtiyaç" pending ZARFI taşınır — değer UYDURULMAZ.
    expect(body.items.every((row) => row.monthly_need.available === false)).toBe(true);
  });

  test("limit tavanı aşılırsa 422 döner (kırpma korkuluğunun kaynağı)", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/stock/summary?limit=500");

    expect(response.status()).toBe(422);
  });
});

test.describe("stok yazma sözleşmesi (durum DEĞİŞTİRMEYEN gövdeler)", () => {
  /**
   * ST §4b kanonu: gövde içi VARLIK referansı 404'tür. Aşağıdaki gövdelerin
   * HİÇBİRİ kaydedilmez — paylaşılan fikstür bozulmaz.
   */
  test("var olmayan depo referansı 404 alır", async ({ page }) => {
    await login(page);

    const response = await page.request.post("/api/backend/stock/entries", {
      data: {
        entry_type: "purchase",
        entry_date: "2026-08-12",
        warehouse_id: "wh-yok",
        lines: [{ item_id: "it-1", quantity: "1.000", quality: "ok" }],
      },
    });

    expect(response.status()).toBe(404);
  });

  test("var olmayan malzeme referansı satır İÇİNDE de 404 alır", async ({ page }) => {
    await login(page);

    const response = await page.request.post("/api/backend/stock/entries", {
      data: {
        entry_type: "purchase",
        entry_date: "2026-08-12",
        warehouse_id: "wh-1",
        lines: [{ item_id: "it-yok", quantity: "1.000", quality: "ok" }],
      },
    });

    expect(response.status()).toBe(404);
  });

  /** ST §4b: biçim/kural ihlali 422 — transferde kaynak depo ZORUNLU. */
  test("kaynaksız transfer 422 alır", async ({ page }) => {
    await login(page);

    const response = await page.request.post("/api/backend/stock/entries", {
      data: {
        entry_type: "transfer",
        entry_date: "2026-08-12",
        warehouse_id: "wh-1",
        lines: [{ item_id: "it-1", quantity: "1.000", quality: "ok" }],
      },
    });

    expect(response.status()).toBe(422);
  });

  test("sıfır miktarlı satır 422 alır", async ({ page }) => {
    await login(page);

    const response = await page.request.post("/api/backend/stock/entries", {
      data: {
        entry_type: "purchase",
        entry_date: "2026-08-12",
        warehouse_id: "wh-1",
        lines: [{ item_id: "it-1", quantity: "0.000", quality: "ok" }],
      },
    });

    expect(response.status()).toBe(422);
  });

  test("var olmayan şantiyeye depo açmak 404 alır (§4b: varlık referansı)", async ({ page }) => {
    await login(page);

    const response = await page.request.post("/api/backend/warehouses", {
      data: { name: "Hayalet Depo", site_id: "s-yok" },
    });

    expect(response.status()).toBe(404);
  });
});
