import type { components } from "@/lib/api/schema";
import type { SiteStatusOption } from "./constants";

/**
 * Depo & tesis kutucuklarının backend anahtarları (spec §4.5). İki grup
 * (Depo Alanları / Şantiye Tesisleri) yalnız GÖRSELDİR; veride tek düz
 * `facilities` nesnesi vardır — ayrı iki state alanı açılmaz.
 */
export const FACILITY_KEYS = [
  "closed_warehouse",
  "open_storage",
  "cold_storage",
  "site_office",
  "canteen",
  "changing_room_wc",
  "dormitory",
  "infirmary",
] as const;

export type FacilityKey = (typeof FACILITY_KEYS)[number];
export type FacilityValues = Record<FacilityKey, boolean>;

/**
 * Formun tüm alanları — hepsi KONTROLLÜ ve string tabanlı (sayı alanları da).
 * Dönüşüm (boş → `null`, `Number(...)`) T10'daki gövde derleyicisinin işidir.
 *
 * `sections` burada YOKTUR: bölüm tablosu kendi satır modelini tutar (T7).
 */
export interface SiteFormValues {
  name: string;
  code: string;
  siteManagerUserId: string;
  /** "" | user.id | OUTSOURCED_SAFETY_OFFICER — üç durumlu tek seçici (§4.1.2). */
  safetyOfficer: string;
  status: SiteStatusOption;
  city: string;
  neighborhood: string;
  parcel: string;
  address: string;
  /** Serbest metin — ayrıştırma/doğrulama/normalleştirme YOKTUR (§4.2.1). */
  gpsCoordinates: string;
  landAreaM2: string;
  constructionAreaM2: string;
  /** "Kat Sayısı" metin alanıdır (`floor_info`), sayı değil. */
  floorInfo: string;
  startDate: string;
  endDate: string;
  budget: string;
  facilities: FacilityValues;
  electricitySubscriptionNo: string;
  waterSubscriptionNo: string;
  plannedWorkerCount: string;
}

function emptyFacilities(): FacilityValues {
  // Sekizi de İŞARETSİZ başlar (§11.12) — mockup'taki ön-işaretler örnek veridir.
  return Object.fromEntries(FACILITY_KEYS.map((key) => [key, false])) as FacilityValues;
}

export function emptySiteFormValues(): SiteFormValues {
  return {
    name: "",
    code: "",
    siteManagerUserId: "",
    safetyOfficer: "",
    status: "active",
    city: "",
    neighborhood: "",
    parcel: "",
    address: "",
    gpsCoordinates: "",
    landAreaM2: "",
    constructionAreaM2: "",
    floorInfo: "",
    startDate: "",
    endDate: "",
    budget: "",
    facilities: emptyFacilities(),
    electricitySubscriptionNo: "",
    waterSubscriptionNo: "",
    plannedWorkerCount: "",
  };
}

/**
 * Gövdenin `facilities` nesnesi — sekiz anahtar HER ZAMAN gider (`false` dahil,
 * §4.5). Eksik anahtar backend'de varsayılana düşer, bu da "işareti kaldırdım"
 * ile "hiç dokunmadım"ı ayırt edilemez kılar.
 */
export function buildFacilities(
  values: FacilityValues,
): components["schemas"]["SiteFacilitiesInput"] {
  return Object.fromEntries(
    FACILITY_KEYS.map((key) => [key, values[key]]),
  ) as components["schemas"]["SiteFacilitiesInput"];
}
