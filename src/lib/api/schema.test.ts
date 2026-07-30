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

// Şantiye Ekle formu · Task T0 — sözleşme senkronu KAPISI (plan T0, spec §3, §3.2).
// Bu blok `pnpm gen:api` çıktısını doğrular. Tipler elle yazılmaz; eksikse
// `openapi/openapi.json` yeniden kopyalanıp üretici koşulur.
describe("Şantiye formu sözleşmesi (T0 kapısı)", () => {
  type SiteCreate = components["schemas"]["SiteCreate"];
  type SiteUpdate = components["schemas"]["SiteUpdate"];
  type SiteCard = components["schemas"]["SiteCard"];

  it("SiteCreate 14 yeni skaler alanı taşır", () => {
    expectTypeOf<SiteCreate>().toHaveProperty("site_manager_user_id");
    expectTypeOf<SiteCreate>().toHaveProperty("safety_officer_user_id");
    expectTypeOf<SiteCreate>().toHaveProperty("safety_officer_is_outsourced");
    expectTypeOf<SiteCreate>().toHaveProperty("neighborhood");
    expectTypeOf<SiteCreate>().toHaveProperty("parcel");
    expectTypeOf<SiteCreate>().toHaveProperty("gps_coordinates");
    expectTypeOf<SiteCreate>().toHaveProperty("land_area_m2");
    expectTypeOf<SiteCreate>().toHaveProperty("construction_area_m2");
    expectTypeOf<SiteCreate>().toHaveProperty("floor_info");
    expectTypeOf<SiteCreate>().toHaveProperty("budget");
    expectTypeOf<SiteCreate>().toHaveProperty("electricity_subscription_no");
    expectTypeOf<SiteCreate>().toHaveProperty("water_subscription_no");
    expectTypeOf<SiteCreate>().toHaveProperty("planned_worker_count");
    expectTypeOf<SiteCreate>().toHaveProperty("is_draft");
    expect(true).toBe(true);
  });

  it("aynı 14 alan SiteUpdate ve SiteCard şemalarında da vardır", () => {
    expectTypeOf<SiteUpdate>().toHaveProperty("site_manager_user_id");
    expectTypeOf<SiteUpdate>().toHaveProperty("safety_officer_is_outsourced");
    expectTypeOf<SiteUpdate>().toHaveProperty("gps_coordinates");
    expectTypeOf<SiteUpdate>().toHaveProperty("planned_worker_count");
    expectTypeOf<SiteUpdate>().toHaveProperty("is_draft");
    expectTypeOf<SiteCard>().toHaveProperty("site_manager_user_id");
    expectTypeOf<SiteCard>().toHaveProperty("safety_officer_is_outsourced");
    expectTypeOf<SiteCard>().toHaveProperty("gps_coordinates");
    expectTypeOf<SiteCard>().toHaveProperty("planned_worker_count");
    expectTypeOf<SiteCard>().toHaveProperty("is_draft");
    expect(true).toBe(true);
  });

  it("facilities sekiz anahtarlı İÇ NESNEDİR, düz has_* alanı sızmaz", () => {
    // İç nesne: gövdede `facilities: { ... }` olarak gider (spec §3.2.1).
    const facilities = {
      closed_warehouse: false,
      open_storage: false,
      cold_storage: false,
      site_office: false,
      canteen: false,
      changing_room_wc: false,
      dormitory: false,
      infirmary: false,
    } satisfies NonNullable<SiteCreate["facilities"]>;

    expect(Object.keys(facilities)).toHaveLength(8);
    // Düz `has_*` alanı üretilmemiş olmalı — eski anahtar seti kullanılmaz.
    expectTypeOf<SiteCreate>().not.toHaveProperty("has_closed_warehouse");
    expectTypeOf<SiteCreate>().not.toHaveProperty("has_site_office");
    expectTypeOf<SiteCard>().toHaveProperty("facilities");
    expectTypeOf<SiteUpdate>().toHaveProperty("facilities");
  });

  it("SiteCounts draft sayacını taşır", () => {
    type SiteCounts = components["schemas"]["SiteCounts"];
    expectTypeOf<SiteCounts>().toHaveProperty("draft");
    expectTypeOf<SiteCounts["draft"]>().toEqualTypeOf<number>();
    expect(true).toBe(true);
  });

  it("SiteStatus preparation değerini içerir", () => {
    type SiteStatus = components["schemas"]["SiteStatus"];
    const statuses: SiteStatus[] = ["preparation", "active", "on_hold", "completed"];
    expect(statuses).toContain("preparation");
  });

  it("sections[] SiteSectionInput dizisidir: manager_user_id var, estimated_amount/sort_order YOK", () => {
    type SectionInput = components["schemas"]["SiteSectionInput"];
    const row = {
      name: "A Blok",
      manager_user_id: "11111111-1111-1111-1111-111111111111",
      start_date: "2026-01-01",
      end_date: "2026-06-30",
    } satisfies SectionInput;

    expectTypeOf<SectionInput>().toHaveProperty("manager_user_id");
    expectTypeOf<SectionInput>().not.toHaveProperty("estimated_amount");
    expectTypeOf<SectionInput>().not.toHaveProperty("sort_order");
    expectTypeOf<SectionInput>().not.toHaveProperty("manager_name");
    expectTypeOf<NonNullable<SiteCreate["sections"]>>().toEqualTypeOf<SectionInput[]>();
    expect(row.name).toBe("A Blok");
  });

  it("SectionResponse manager_user_id taşır", () => {
    type SectionResponse = components["schemas"]["SectionResponse"];
    expectTypeOf<SectionResponse>().toHaveProperty("manager_user_id");
    expect(true).toBe(true);
  });

  it("duration_days hiçbir şantiye şemasında YOKTUR (süre türevdir, spec §3.6)", () => {
    expectTypeOf<SiteCreate>().not.toHaveProperty("duration_days");
    expectTypeOf<SiteUpdate>().not.toHaveProperty("duration_days");
    expectTypeOf<SiteCard>().not.toHaveProperty("duration_days");
    expectTypeOf<components["schemas"]["SiteDetailResponse"]>().not.toHaveProperty("duration_days");
    expect(true).toBe(true);
  });

  it("UserResponse title alanını taşır (seçici etiketi buna bağlı, spec §11.2)", () => {
    type UserResponse = components["schemas"]["UserResponse"];
    expectTypeOf<UserResponse>().toHaveProperty("title");
    expectTypeOf<UserResponse>().toHaveProperty("full_name");
    expect(true).toBe(true);
  });
});
