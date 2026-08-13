import { test, expect, type Page } from "@playwright/test";

// F-SA T1 · Satınalma ALTYAPI e2e'si (ekran DEĞİL — ekranlar T2/T3/T4).
// `stock-api.spec.ts` / `documents-api.spec.ts` deseninin aynısı.
//
// Neden UI'sız: bu dilimde basılan tek şey BFF kökleri + hook + mock
// katmanıdır ve buradaki davranışlar jsdom'da KANITLANAMAZ:
//   1. DÖRT kökün (`suppliers` · `purchase-requests` · `purchase-orders` ·
//      `purchasing`) BFF izin listesinden gerçekten geçmesi — kök düşerse
//      YALNIZ CANLIDA 404 gelir, jsdom testleri bunu görmez;
//   2. `purchasing`in AYRI bir kök olduğu (`/purchasing/summary` uçunun ilk
//      segmenti `purchase-requests` DEĞİLDİR);
//   3. tutar/rozet türevlerinin SUNUCUDAN gelmesi (istemci hesaplamaz).
// İstekler `page.request` ile atılır: giriş sonrası httpOnly oturum çerezi
// aynı bağlamdan taşınır, token URL'e KONMAZ.
//
// 🔒 FİKSTÜR İZOLASYONU: bu dosya YALNIZ OKUR. Satınalma yazma akışlarının
// uçtan uca kanıtı T5'in ekran e2e'lerinde ve kapanış smoke'unda alınır;
// burada yazmak T2-T4'ün görsel baseline'larını sessizce kaydırırdı.

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

interface RequestRow {
  id: string;
  request_no: string;
  status: string;
  estimated_total: string;
  line_count: number;
  can_delete: boolean;
}

interface QuoteCard {
  id: string;
  supplier_name: string;
  unit_price: string;
  total_cost: string;
  is_best_price: boolean;
  shipping_included: boolean;
  shipping_cost: string | null;
}

test.describe("satınalma altyapısı (salt-okur)", () => {
  test("purchase-requests kökü BFF'ten geçer; altı durumun hepsi süzülebilir", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/purchase-requests?limit=200");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { items: RequestRow[]; total: number };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.total).toBe(body.items.length);

    // SAT sekme şeridinin dayandığı küme fikstürde TAM temsil edilir.
    const statuses = new Set(body.items.map((row) => row.status));
    for (const status of [
      "draft",
      "pending_approval",
      "quote_wait",
      "ordered",
      "delivered",
      "rejected",
    ]) {
      expect(statuses).toContain(status);
    }

    // K3: "Teklifler" sekmesi ayrı bir uç değil, `status` süzgecidir.
    const filtered = await page.request.get("/api/backend/purchase-requests?status=quote_wait");
    const filteredBody = (await filtered.json()) as { items: RequestRow[] };
    expect(filteredBody.items.every((row) => row.status === "quote_wait")).toBe(true);
    expect(filteredBody.items.length).toBeLessThan(body.items.length);
  });

  /**
   * 🔴 NULL-EŞİK KANONU (SA dersi): fiyatı BİLİNMEYEN kalem tahmini toplama
   * GİRMEZ ve "0 TL" olarak da gösterilmez. Sunucu `line_total`ı `null`
   * bırakır; ekran bunu bir eksiklik olarak basmak zorundadır.
   */
  test("fiyatsız kalem toplama girmez; katalogsuz kalemde bakiye null gelir", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/purchase-requests/pr-2");

    expect(response.status()).toBe(200);
    const detail = (await response.json()) as {
      estimated_total: string;
      lines: Array<{
        name: string;
        line_total: string | null;
        estimated_unit_price: string | null;
        current_stock: string | null;
        stock_item_id: string | null;
      }>;
    };
    const priceless = detail.lines.find((line) => line.estimated_unit_price === null);
    expect(priceless).toBeDefined();
    expect(priceless?.line_total).toBeNull();
    // Katalogsuz kalemde bakiye "0" DEĞİL `null`dur.
    expect(priceless?.stock_item_id).toBeNull();
    expect(priceless?.current_stock).toBeNull();
    // Toplam yalnız fiyatı BİLİNEN kalemden gelir (400 × 185 = 74.000).
    expect(detail.estimated_total).toBe("74000.00");
  });

  /**
   * "EN İYİ FİYAT" SUNUCU türevidir ve TOPLAM MALİYETE bakar: birim fiyatı en
   * düşük teklif (`q-2`) nakliyesi hariç olduğu için rozeti ALMAZ.
   */
  test("teklif rozeti birim fiyata değil toplam maliyete bakar", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/purchase-requests/pr-1/quotes");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      items: QuoteCard[];
      total: number;
      request_quantity_total: string;
    };
    expect(body.total).toBe(body.items.length);
    expect(body.request_quantity_total).toBe("12.000");

    const cheapestUnitPrice = [...body.items].sort(
      (a, b) => Number(a.unit_price) - Number(b.unit_price),
    )[0];
    const best = body.items.filter((quote) => quote.is_best_price);
    expect(best).toHaveLength(1);
    expect(best[0].id).not.toBe(cheapestUnitPrice.id);
    // Nakliye hariç teklifin toplamına nakliye EKLENMİŞTİR.
    expect(cheapestUnitPrice.shipping_included).toBe(false);
    expect(Number(cheapestUnitPrice.total_cost)).toBeGreaterThan(
      Number(cheapestUnitPrice.unit_price) * 12,
    );
  });

  test("suppliers kökü geçer; kart tutarı SUNUCU türevidir ve siparişsizde sıfırdır", async ({
    page,
  }) => {
    await login(page);

    const response = await page.request.get("/api/backend/suppliers?limit=200");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      items: Array<{
        id: string;
        orders_total_this_year: string;
        orders_count_this_year: number;
        is_active: boolean;
      }>;
    };
    const idle = body.items.find((row) => row.orders_count_this_year === 0);
    expect(idle).toBeDefined();
    // "veri yok" değil "hiç sipariş verilmedi": `null` DEĞİL sıfır.
    expect(idle?.orders_total_this_year).toBe("0.00");

    const passive = await page.request.get("/api/backend/suppliers?is_active=false");
    const passiveBody = (await passive.json()) as { items: Array<{ is_active: boolean }> };
    expect(passiveBody.items.length).toBeGreaterThan(0);
    expect(passiveBody.items.every((row) => row.is_active === false)).toBe(true);
  });

  test("purchase-orders kökü geçer; talepsiz sipariş request_no taşımaz", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/purchase-orders?limit=200");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      items: Array<{ request_id: string | null; request_no: string | null; status: string }>;
    };
    const direct = body.items.find((row) => row.request_id === null);
    expect(direct).toBeDefined();
    expect(direct?.request_no).toBeNull();
  });

  /**
   * KPI şeridinin ucu AYRI bir kökten geçer. Bu kök izin listesinde olmasaydı
   * ekranlar açılır ama şerit sonsuza dek boş kalırdı — en sinsi düşüş.
   */
  test("purchasing kökü AYRI geçer; özet zarfsızdır (0 gerçek bir cevaptır)", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/purchasing/summary");

    expect(response.status()).toBe(200);
    const summary = (await response.json()) as Record<string, unknown>;
    for (const key of [
      "open_requests",
      "quote_wait_requests",
      "pending_approval_requests",
      "orders_this_month_total",
      "active_orders",
      "in_transit_orders",
      "delivered_orders",
    ]) {
      expect(summary).toHaveProperty(key);
      // `MetricPlaceholder` zarfı YOKTUR — değer düz sayı/metindir.
      expect(summary[key]).not.toHaveProperty("pending_module");
    }
    expect(summary.pending_approval_requests).toBe(1);
  });

  test("izin listesinde olmayan uydurma 'quotes' kökü 404 alır", async ({ page }) => {
    await login(page);

    const response = await page.request.get("/api/backend/quotes/q-1");

    expect(response.status()).toBe(404);
  });
});
