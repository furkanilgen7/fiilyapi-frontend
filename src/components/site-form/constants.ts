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
 * `SiteCreate`'in metin alanları için SUNUCU sözleşmesindeki uzunluk sınırları
 * (`openapi/openapi.json` → `components.schemas.SiteCreate`).
 *
 * Anahtarlar **sözleşme adlarıdır** (form alan adları değil): kapı testi
 * `field-limits.test.ts` bu haritayı üretilen sözleşmeyle karşılaştırır, yani
 * sayılar burada elle "uydurulamaz" — sözleşme değişirse test kırmızı olur.
 *
 * YALNIZ UZUNLUKTUR. Hiçbir alana biçim doğrulaması, regex, normalleştirme ya
 * da yeni hata metni eklenmez (spec §4.2.1, §11.13). Bu koruma olmadan sınırı
 * aşan girdi kullanıcıya HİÇ uyarı vermeden sunucu 422'sine çarpıyordu.
 */
export const SITE_FIELD_MAX_LENGTH = {
  name: 150,
  code: 50,
  city: 100,
  neighborhood: 150,
  parcel: 50,
  address: 300,
  gps_coordinates: 50,
  floor_info: 100,
  electricity_subscription_no: 50,
  water_subscription_no: 50,
} as const satisfies Record<string, number>;
