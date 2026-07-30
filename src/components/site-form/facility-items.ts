import type { FacilityKey } from "./form-state";

export interface FacilityItem {
  key: FacilityKey;
  label: string;
}

/**
 * Kutucuk listeleri (mockup satır 153–155 ve 161–165).
 *
 * İki grup YALNIZ GÖRSELDİR: veride tek düz `facilities` nesnesi vardır
 * (spec §3.2.1). "depo" ve "tesis" diye ayrı iki state alanı açılmaz.
 * Anahtarlar backend sözleşmesinden gelir — eski `d1_kapali_ambar` /
 * `santiye_ofisi` seti kullanılmaz.
 */
export const STORAGE_FACILITIES: readonly FacilityItem[] = [
  { key: "closed_warehouse", label: "D-1 Kapalı Ambar" },
  { key: "open_storage", label: "D-2 Açık Alan (Demir, kum, çakıl)" },
  { key: "cold_storage", label: "D-3 Soğuk Hava Deposu" },
];

export const SITE_FACILITIES: readonly FacilityItem[] = [
  { key: "site_office", label: "Şantiye Ofisi (Konteyner)" },
  { key: "canteen", label: "İşçi Yemekhanesi" },
  { key: "changing_room_wc", label: "Soyunma / WC" },
  { key: "dormitory", label: "İşçi Yatakhanesi" },
  { key: "infirmary", label: "Revir / İlk Yardım" },
];
