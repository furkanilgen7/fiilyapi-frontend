import { describe, it, expect } from "vitest";

import { buildSiteCreateBody } from "./build-body";
import { OUTSOURCED_SAFETY_OFFICER } from "./constants";
import { emptySiteFormValues, type SiteFormValues } from "./form-state";
import { emptySectionRow, type SectionRow } from "./sections-validate";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function values(overrides: Partial<SiteFormValues> = {}): SiteFormValues {
  return { ...emptySiteFormValues(), name: "C-Blok Şantiyesi", ...overrides };
}

function build(
  overrides: Partial<SiteFormValues> = {},
  rows: SectionRow[] = [],
  isDraft = false,
) {
  return buildSiteCreateBody(values(overrides), rows, { isDraft });
}

describe("buildSiteCreateBody — gövde derleyicisi (spec §9.3)", () => {
  it("kod bosken govdede 'code' anahtari HIC YOK", () => {
    const body = build({ code: "   " });
    expect("code" in body).toBe(false);
  });

  it("kod doluyken govdede kirpilmis olarak gider", () => {
    expect(build({ code: " SNT-2026-003 " }).code).toBe("SNT-2026-003");
  });

  it("bos metin alanlari null gider", () => {
    const body = build();
    expect(body.city).toBeNull();
    expect(body.neighborhood).toBeNull();
    expect(body.parcel).toBeNull();
    expect(body.address).toBeNull();
    expect(body.gps_coordinates).toBeNull();
    expect(body.floor_info).toBeNull();
    expect(body.start_date).toBeNull();
    expect(body.end_date).toBeNull();
    expect(body.electricity_subscription_no).toBeNull();
    expect(body.water_subscription_no).toBeNull();
  });

  it("sayi alanlari bosken null, doluyken Number", () => {
    expect(build().land_area_m2).toBeNull();
    expect(build().construction_area_m2).toBeNull();
    expect(build().budget).toBeNull();
    expect(build().planned_worker_count).toBeNull();

    const filled = build({
      landAreaM2: "2840",
      constructionAreaM2: "6420",
      budget: "11200000",
      plannedWorkerCount: "48",
    });
    expect(filled.land_area_m2).toBe(2840);
    expect(filled.construction_area_m2).toBe(6420);
    expect(filled.budget).toBe(11200000);
    expect(filled.planned_worker_count).toBe(48);
  });

  it("GPS metni oldugu gibi gider: '41.0082N 28.9784E'", () => {
    expect(build({ gpsCoordinates: "41.0082N 28.9784E" }).gps_coordinates).toBe(
      "41.0082N 28.9784E",
    );
  });

  it("'Dis Kaynak — OSGB' secilince is_outsourced=true ve user_id=null", () => {
    const body = build({ safetyOfficer: OUTSOURCED_SAFETY_OFFICER });
    expect(body.safety_officer_user_id).toBeNull();
    expect(body.safety_officer_is_outsourced).toBe(true);
  });

  it("kullanici secilince user_id UUID, is_outsourced=false", () => {
    const body = build({ safetyOfficer: USER_ID });
    expect(body.safety_officer_user_id).toBe(USER_ID);
    expect(body.safety_officer_is_outsourced).toBe(false);
  });

  it("hicbiri secilmeyince user_id=null, is_outsourced=false", () => {
    const body = build();
    expect(body.safety_officer_user_id).toBeNull();
    expect(body.safety_officer_is_outsourced).toBe(false);
  });

  it("safety_officer_is_outsourced ve is_draft HER ZAMAN govdededir", () => {
    // İkisinin de sunucuda varsayılanı var ama sözleşmede `required`; eksik
    // gönderim "kapattım" ile "hiç dokunmadım"ı ayırt edilemez kılar.
    const body = build();
    expect("safety_officer_is_outsourced" in body).toBe(true);
    expect("is_draft" in body).toBe(true);
  });

  it("sef secilince site_manager_user_id UUID, secilmeyince null", () => {
    expect(build({ siteManagerUserId: USER_ID }).site_manager_user_id).toBe(USER_ID);
    expect(build().site_manager_user_id).toBeNull();
  });

  it("facilities sekiz anahtari da tasir, isaretsizler false", () => {
    const body = build();
    expect(Object.keys(body.facilities ?? {}).sort()).toEqual(
      [
        "canteen",
        "changing_room_wc",
        "closed_warehouse",
        "cold_storage",
        "dormitory",
        "infirmary",
        "open_storage",
        "site_office",
      ].sort(),
    );
    expect(Object.values(body.facilities ?? {}).every((v) => v === false)).toBe(true);
  });

  it("isaretlenen kutu ilgili facilities anahtarini true yapar", () => {
    const base = emptySiteFormValues();
    const body = build({ facilities: { ...base.facilities, canteen: true } });
    expect(body.facilities?.canteen).toBe(true);
    expect(body.facilities?.dormitory).toBe(false);
  });

  it("govdede site_manager_name / safety_officer_name YOK", () => {
    const body: Record<string, unknown> = build({ siteManagerUserId: USER_ID });
    expect("site_manager_name" in body).toBe(false);
    expect("safety_officer_name" in body).toBe(false);
  });

  it("govdede duration_days, delivery_date, project_id YOK", () => {
    const body: Record<string, unknown> = build({
      startDate: "2026-01-01",
      endDate: "2026-01-10",
    });
    expect("duration_days" in body).toBe(false);
    expect("delivery_date" in body).toBe(false);
    expect("project_id" in body).toBe(false);
  });

  it("govdede belge anahtari YOK", () => {
    const body: Record<string, unknown> = build();
    const documentKeys = Object.keys(body).filter(
      (key) => key.includes("document") || key.includes("file") || key.includes("belge"),
    );
    expect(documentKeys).toEqual([]);
  });

  it("durum secimi preparation/active/on_hold olarak gider", () => {
    expect(build({ status: "preparation" }).status).toBe("preparation");
    expect(build({ status: "active" }).status).toBe("active");
    expect(build({ status: "on_hold" }).status).toBe("on_hold");
  });

  it("is_draft=true taslak yolunda gider, normal yolda false", () => {
    expect(build({}, [], true).is_draft).toBe(true);
    expect(build({}, [], false).is_draft).toBe(false);
  });

  it("bolumler collectSectionInputs ciktisi olarak ayni govdede gider", () => {
    const row: SectionRow = { ...emptySectionRow(), name: "Kaba Yapı" };
    const blank = emptySectionRow();
    const body = build({}, [row, blank]);
    expect(body.sections).toEqual([{ name: "Kaba Yapı" }]);
  });

  it("bolum yoksa sections bos dizi olarak gider", () => {
    expect(build().sections).toEqual([]);
  });
});
