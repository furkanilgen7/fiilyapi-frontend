/**
 * F-UNIT1 · UE (`Form - Unite Ekle.dc.html`) — "Ünite Ekle" formunun
 * sabitleri. Parantez içi `UE nn` O DOSYANIN satır numarasıdır.
 */

import type { DocumentPlaceholderItem } from "@/components/form-shell";
import type { components } from "@/lib/api/schema";
import { routes } from "@/lib/routes";

export type UnitKind = components["schemas"]["UnitKind"];
export type UnitFacing = components["schemas"]["UnitFacing"];
export type UnitParkingRight = components["schemas"]["UnitParkingRight"];
export type UnitSalesStatus = components["schemas"]["UnitSalesStatus"];
export type UnitOwnerSide = components["schemas"]["UnitOwnerSide"];

export const UNIT_FORM_TITLE = "Ünite Ekle / Düzenle"; // UE 57
export const UNIT_FORM_SUBTITLE = "Tek ünite kaydı — çok ünite için Toplu Üretim kullanın"; // UE 58

export const UNIT_LOCATION_CARD_TITLE = "Konum"; // UE 61
export const UNIT_INFO_CARD_TITLE = "Ünite Bilgileri"; // UE 71
export const UNIT_PRICING_CARD_TITLE = "Fiyatlandırma"; // UE 86

export const UNIT_SUBMIT_LABEL = "Üniteyi Kaydet"; // UE 127
export const UNIT_SUBMIT_AND_NEW_LABEL = "Kaydet & Yeni Ekle"; // UE 126
export const UNIT_CANCEL_LABEL = "İptal"; // UE 125

/** İptal/başarı dönüşü — kabuk canonu. */
export const UNITS_LIST_HREF = routes.sales.root();

/** Sunucu sözleşmesinin uzunluk sınırları (`units/schemas.py`). */
export const UNIT_FLOOR_MAX_LENGTH = 20; // UE 66
export const UNIT_NO_MAX_LENGTH = 30; // UE 73
export const UNIT_LAYOUT_MAX_LENGTH = 20; // UE 75

export const UNIT_NO_HINT = "Blok-No formatı önerilir"; // UE 73
export const UNIT_PRICE_PER_M2_HINT = "Brüt m² üzerinden"; // UE 89
export const UNIT_APPRAISAL_HINT = "Tapu harcı hesabı için"; // UE 90
export const UNIT_MIN_SALE_PRICE_HINT = "Danışman bu fiyatın altına inemez"; // UE 92
export const UNIT_OWNER_SIDE_HINT = "Kat karşılığı projelerde"; // UE 95

export interface UnitOption<TValue extends string> {
  value: TValue;
  label: string;
}

/**
 * UE 74 "Ünite Türü". 🔴 `unit_kind` sunucuda **NOT NULL**dır
 * (`models.py: nullable=False`) — dokunma kapısına GİRMEZ, gövdede DAİMA
 * bulunur (bkz. `build-body.ts`).
 */
export const UNIT_KIND_OPTIONS: readonly UnitOption<UnitKind>[] = [
  { value: "apartment", label: "Daire" }, // UE 74 (`selected`)
  { value: "shop", label: "Dükkan / Ticari" }, // UE 74
  { value: "office", label: "Ofis" }, // UE 74
  { value: "warehouse", label: "Depo" }, // UE 74
  { value: "parking", label: "Otopark" }, // UE 74
];

/**
 * UE 75 "Oda Tipi". Sunucuda SERBEST METİNDİR (`layout: str | None`, max 20)
 * ama mockup küratörlü bir seçici çizer — mockup kazanır, saklanan METİNdir.
 * Boş seçeneği YOKTUR → dokunma kapısına girer.
 */
export const UNIT_LAYOUT_OPTIONS: readonly string[] = [
  "1+0 (Stüdyo)", // UE 75
  "1+1", // UE 75
  "2+1", // UE 75
  "3+1", // UE 75 (`selected`)
  "4+1", // UE 75
  "5+1 Dubleks", // UE 75
];

/**
 * UE 78 "Cephe / Yön".
 *
 * 🔴 ONAYLI SAPMA — MOCKUP + BİR: mockup DÖRT seçenek çizer (Güney ·
 * Güney-Batı · Doğu · Kuzey) ama sunucu enum'u BEŞ değerlidir (`UnitFacing` =
 * south · southwest · east · north · **west**). Dördünü basmak `west`i UI'dan
 * ULAŞILMAZ kılardı: içe aktarmayla ya da başka bir yoldan `west` yazılmış bir
 * ünite ekranda düzeltilemez hale gelirdi. Beşincisi ("Batı") EKLENDİ; ilk
 * dördünün etiketi mockup'tan BİREBİR korunur.
 */
export const FACING_OPTIONS: readonly UnitOption<UnitFacing>[] = [
  { value: "south", label: "Güney" }, // UE 78
  { value: "southwest", label: "Güney-Batı" }, // UE 78 (`selected`)
  { value: "east", label: "Doğu" }, // UE 78
  { value: "north", label: "Kuzey" }, // UE 78
  { value: "west", label: "Batı" }, // mockup'ta YOK — enum'un beşinci değeri
];

/** UE 81 "Otopark Hakkı" — boş seçenek YOK → dokunma kapısı. */
export const PARKING_RIGHT_OPTIONS: readonly UnitOption<UnitParkingRight>[] = [
  { value: "none", label: "Yok" }, // UE 81
  { value: "one_closed", label: "1 Araç (Kapalı)" }, // UE 81 (`selected`)
  { value: "two", label: "2 Araç" }, // UE 81
];

/**
 * UE 93 "KDV Oranı" — küme KODDA SABİTTİR: yalnız `{1, 10, 20}`
 * (`units/schemas.py::_ALLOWED_VAT_RATES`, karar 9). Kolon `Numeric(5,2)`
 * serbesttir ve DB CHECK yalnız `0..100` der; kümeyi bu liste zorlar.
 */
export const VAT_RATE_OPTIONS: readonly UnitOption<string>[] = [
  { value: "1", label: "%1 (150m² altı)" }, // UE 93
  { value: "10", label: "%10" }, // UE 93 (`selected`)
  { value: "20", label: "%20 (Ticari)" }, // UE 93
];

/**
 * UE 94 "Durum". Mockup `selected` = "Satışta (Boş)", sunucu varsayılanı da
 * `listed` — İKİSİ AYNI. Üretilmiş tipte anahtar ZORUNLU olduğu için
 * dokunma kapısına GİRMEZ, gövdede DAİMA bulunur (bkz. `build-body.ts`).
 */
export const SALES_STATUS_OPTIONS: readonly UnitOption<UnitSalesStatus>[] = [
  { value: "listed", label: "Satışta (Boş)" }, // UE 94 (`selected`)
  { value: "reserved", label: "Rezerve" }, // UE 94
  { value: "sold", label: "Satıldı" }, // UE 94
  { value: "closed", label: "Satışa Kapalı" }, // UE 94
];

/** UE 95 "Sahiplik" — boş seçenek YOK → dokunma kapısı. */
export const OWNER_SIDE_OPTIONS: readonly UnitOption<UnitOwnerSide>[] = [
  { value: "contractor", label: "Yüklenici (Biz)" }, // UE 95 (`selected`)
  { value: "landowner", label: "Arsa Sahibi Payı" }, // UE 95
];

/** UE 89 türev kutusu — değeri olmayan türevin gösterimi. */
export const EMPTY_METRIC = "—";
export const UNIT_PRICE_PER_M2_LABEL = "m² Birim Fiyat"; // UE 89

/**
 * 🔴 UE 91 "Maliyet (₺)" — KARAR 3: **SUNUCUDA MALİYET SÜTUNU YOKTUR**
 * (`units/models.py`: *"Maliyet sutunu ACILMAZ … `unit_cost` ve
 * `expected_profit` yer tutucu olarak doner"*). Maliyet ileride İş
 * Kalemleri/satınalmadan hesaplanacaktır.
 *
 * Canon gereği kutu SİLİNMEZ: salt-okunur/devre dışı, GÖRÜNÜR gerekçeyle
 * basılır ve `form-state.ts`te KARŞILIĞI YOKTUR — gövdeye sızması yapısal
 * olarak imkânsızdır.
 */
export const UNIT_COST_LABEL = "Maliyet (₺)"; // UE 91
export const UNIT_COST_HINT = "Kâr hesabı için"; // UE 91
export const UNIT_COST_PENDING_REASON =
  "Ünite maliyeti elle girilmez — proje maliyet modülünden (İş Kalemleri / satınalma) otomatik hesaplanacak";

/**
 * 🔴 UE 97-99 "Beklenen Kâr" — girdisi maliyettir, maliyet ise yok. Bu yüzden
 * İSTEMCİDE HESAPLANAMAZ; uydurma bir sayı basmak yerine gerekçe gösterilir.
 */
export const UNIT_EXPECTED_PROFIT_LABEL = "Beklenen Kâr"; // UE 98
export const UNIT_EXPECTED_PROFIT_FORMULA = "Liste fiyatı − maliyet"; // UE 98
export const UNIT_EXPECTED_PROFIT_PENDING_REASON =
  "Maliyet henüz hesaplanmadığı için beklenen kâr gösterilemiyor";

/**
 * PATH parametresi eksikken kaydetme denemesinin GÖRÜNÜR gerekçesi.
 *
 * 🔴 KARAR 11'in İSTİSNASI DEĞİLDİR: karar GÖVDE ALANLARI içindir, oysa
 * `project_id` gövdede değil YOLDADIR (`POST /projects/{project_id}/units`).
 * Boşken istek `/projects//units` olur, fetch onu `/projects/units`e normalize
 * eder ve backend 422 döner — kullanıcı sebebini ASLA öğrenemez (F-P5'te canlı
 * smoke'ta yakalanan kusur sınıfı). İstek hiç kurulmaz, bu cümle basılır.
 */
export const UNIT_PROJECT_REQUIRED_MESSAGE =
  "Önce bir proje seçin — ünite kaydı projenin altına yazılır.";

/** Sunucu hatası için genel yedek metin. */
export const UNIT_SAVE_ERROR_FALLBACK = "Ünite kaydedilemedi.";

/** UE 104-121 "Ünite Belgeleri" — BC form-slot'a pending. */
export const UNIT_DOCUMENTS_TITLE = "Ünite Belgeleri"; // UE 104
export const UNIT_DOCUMENTS_PENDING_REASON =
  "Belge yükleme Belge Yönetimi'ne bağlanınca açılacak — belge kaydında henüz ünite bağı yok";

/** UE 106-120 — üç belge kutusu (emoji + zemin tonu + başlık + alt metin). */
export const UNIT_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "📐",
    iconBg: "var(--color-accent-purple-soft)",
    title: "Kat Planı",
    subtitle: "DWG veya PDF",
  }, // UE 106-110
  {
    emoji: "📷",
    iconBg: "var(--color-success-tint)",
    title: "Görseller / Render",
    subtitle: "Satış broşürü için",
  }, // UE 111-115
  {
    emoji: "📜",
    iconBg: "var(--color-primary-soft)",
    title: "Kat İrtifakı Tapusu",
    subtitle: "Bağımsız bölüm tapusu",
  }, // UE 116-120
];
