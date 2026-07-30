import { describe, it, expect, expectTypeOf } from "vitest";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

describe("API tip üretimi", () => {
  it("apiClient tanımlıdır ve GET/POST metodları vardır", () => {
    expect(apiClient).toBeDefined();
    expect(typeof apiClient.GET).toBe("function");
    expect(typeof apiClient.POST).toBe("function");
  });

  it("MeResponse şeması beklenen alanları taşır", () => {
    type Me = components["schemas"]["MeResponse"];
    expectTypeOf<Me>().toHaveProperty("email");
    expectTypeOf<Me>().toHaveProperty("role_key");
    expectTypeOf<Me>().toHaveProperty("status");
  });

  it("TokenPair şeması access/refresh token taşır", () => {
    type Tokens = components["schemas"]["TokenPair"];
    expectTypeOf<Tokens>().toHaveProperty("access_token");
    expectTypeOf<Tokens>().toHaveProperty("refresh_token");
  });
});

// Ekran 13 · İş Kalemleri (BOQ) — Task F1 tip doğrulama kapısı (spec §6.2, §14 F1).
// Bu blok bir KAPIDIR: tipler `pnpm gen:api` ile üretilmediyse `pnpm typecheck`
// kırmızı olur. Elle tip yazmak yasak — eksikse openapi.json yeniden kopyalanır.
describe("BOQ tip üretimi (Ekran 13 kapısı)", () => {
  it("BoqListResponse, BoqTotals, BoqGroupResponse, BoqItemResponse tipleri üretilmiş", () => {
    type BoqListResponse = components["schemas"]["BoqListResponse"];
    type BoqTotals = components["schemas"]["BoqTotals"];
    type BoqGroupResponse = components["schemas"]["BoqGroupResponse"];
    type BoqItemResponse = components["schemas"]["BoqItemResponse"];

    // Liste yanıtı hem toplamları hem grupları taşır (spec §6.2).
    expectTypeOf<BoqListResponse>().toHaveProperty("totals");
    expectTypeOf<BoqListResponse>().toHaveProperty("groups");
    // `grand_total` GERÇEK veri, kalan dört alan yer tutucu (spec §4).
    expectTypeOf<BoqTotals>().toHaveProperty("grand_total");
    expectTypeOf<BoqTotals>().toHaveProperty("contract_total");
    expectTypeOf<BoqTotals>().toHaveProperty("realized_total");
    expectTypeOf<BoqTotals>().toHaveProperty("remaining_total");
    expectTypeOf<BoqTotals>().toHaveProperty("revision_total");
    expectTypeOf<BoqTotals>().toHaveProperty("grand_progress_pct");
    // Grup satırı kalemlerini gömülü taşır; `group_total` türevdir.
    expectTypeOf<BoqGroupResponse>().toHaveProperty("items");
    expectTypeOf<BoqGroupResponse>().toHaveProperty("group_total");
    expectTypeOf<BoqGroupResponse>().toHaveProperty("sort_order");
    // Poz satırı: 7 sütunun kaynağı + türev `amount` (frontend hesaplamaz, spec §3.4).
    expectTypeOf<BoqItemResponse>().toHaveProperty("code");
    expectTypeOf<BoqItemResponse>().toHaveProperty("description");
    expectTypeOf<BoqItemResponse>().toHaveProperty("unit");
    expectTypeOf<BoqItemResponse>().toHaveProperty("quantity");
    expectTypeOf<BoqItemResponse>().toHaveProperty("unit_price");
    expectTypeOf<BoqItemResponse>().toHaveProperty("amount");
    expectTypeOf<BoqItemResponse>().toHaveProperty("progress_pct");
    // Decimal alanlar string olarak gelir (hassasiyet korunur).
    expectTypeOf<BoqItemResponse["quantity"]>().toEqualTypeOf<string>();
    expectTypeOf<BoqItemResponse["amount"]>().toEqualTypeOf<string>();
    expectTypeOf<BoqTotals["grand_total"]>().toEqualTypeOf<string>();
    expect(true).toBe(true);
  });

  it("BoqGroupCreate/Update ve BoqItemCreate/Update tipleri üretilmiş", () => {
    type BoqGroupCreate = components["schemas"]["BoqGroupCreate"];
    type BoqGroupUpdate = components["schemas"]["BoqGroupUpdate"];
    type BoqItemCreate = components["schemas"]["BoqItemCreate"];
    type BoqItemUpdate = components["schemas"]["BoqItemUpdate"];

    expectTypeOf<BoqGroupCreate>().toHaveProperty("name");
    expectTypeOf<BoqGroupUpdate>().toHaveProperty("name");
    expectTypeOf<BoqItemCreate>().toHaveProperty("group_id");
    expectTypeOf<BoqItemCreate>().toHaveProperty("code");
    expectTypeOf<BoqItemUpdate>().toHaveProperty("code");

    // Form string gönderir (spec §6.2): `number | string` kabul edilmeli.
    const groupBody = { name: "KABA YAPI", sort_order: 10 } satisfies BoqGroupCreate;
    const itemBody = {
      group_id: "11111111-1111-1111-1111-111111111111",
      code: "01.001",
      description: "Beton dökümü",
      unit: "m³",
      quantity: "1240.000",
      unit_price: "280.00",
      sort_order: 1,
    } satisfies BoqItemCreate;
    const itemPatch = { code: "01.002" } satisfies BoqItemUpdate;

    expect(groupBody.name).toBe("KABA YAPI");
    expect(itemBody.quantity).toBe("1240.000");
    expect(itemPatch.code).toBe("01.002");
  });

  it("AccessLevel tipi üretilmiş", () => {
    type AccessLevel = components["schemas"]["AccessLevel"];
    // F12 izin altyapısı bu birlik tipine dayanır (spec §2.5).
    const write: AccessLevel = "full";
    const read: AccessLevel = "view";
    expect([write, read]).toEqual(["full", "view"]);
  });
});
