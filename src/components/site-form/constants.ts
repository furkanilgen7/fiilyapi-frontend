import type { components } from "@/lib/api/schema";

/**
 * İSG seçicisinin "Dış Kaynak — OSGB" seçeneğinin İSTEMCİ İÇİ sabit değeri
 * (spec §4.1.2). Gövdeye **gitmez**: T10'daki gövde derleyicisi bunu
 * `{ safety_officer_user_id: null, safety_officer_is_outsourced: true }`
 * çiftine çevirir. Dize tek yerde durur.
 */
export const OUTSOURCED_SAFETY_OFFICER = "__outsourced__";

/** Seçicilerin ilk (boş) seçeneği — spec §15/20. */
export const SELECT_PLACEHOLDER = "Seçiniz…";

/**
 * Kişi seçicilerinin altındaki notlar (spec §15/23a, §15/23b, §15/80).
 *
 * `forbidden` metni kullanıcı onaylıdır (2026-07-30) ve envantere §15/23b olarak
 * eklenmiştir; **birebir** basılır. Sessiz boş açılır liste yasaktır.
 */
export const USER_LIST_NOTES = {
  incomplete: "Listede aradığınız kişi yoksa kullanıcı listesi henüz tamamlanmamış olabilir.",
  forbidden: "Kişi listesini görme yetkiniz yok — bu alanları boş bırakabilirsiniz.",
  error: "Kullanıcılar yüklenemedi",
  loading: "Yükleniyor…",
} as const;

export type SiteStatusOption = Exclude<components["schemas"]["SiteStatus"], "completed">;

/**
 * Durum seçeneği (mockup satır 71). `completed` açılırda YOKTUR ama backend
 * enum'unda kalır — `SiteCounts.completed` ve liste sekmesi ona bağlıdır.
 */
export const SITE_STATUS_OPTIONS: readonly { value: SiteStatusOption; label: string }[] = [
  { value: "preparation", label: "Hazırlık" },
  { value: "active", label: "Aktif" },
  { value: "on_hold", label: "Beklemede" },
];

/** "Bağlı Proje" kilitli seçicisinin açıklaması (spec §4.1.1, §15/18). */
export const LINKED_PROJECT_TITLE = "Şantiye, girildiği projeye bağlıdır";

/**
 * `gps_coordinates` sunucu sözleşmesindeki uzunluk sınırı (openapi.json:
 * `maxLength: 50`). YALNIZ uzunluktur — GPS için biçim doğrulaması, regex ve
 * normalleştirme YOKTUR (spec §4.2.1, §11.13).
 */
export const GPS_MAX_LENGTH = 50;
