import type { DocumentPlaceholderItem } from "@/components/form-shell";
import type { components } from "@/lib/api/schema";
import { routes } from "@/lib/routes";

/**
 * "Form - Makine Ekle.dc.html" (M2) sabitleri. Yorumlardaki sayılar O DOSYANIN
 * SATIR numaralarıdır.
 *
 * ÜST KURAL: mockup'ta ne varsa aynısı basılır. Backend karşılığı olmayan alan
 * SİLİNMEZ — devre-dışı basılır, gerekçesi GÖRÜNÜR yazılır ve gövdeye ASLA
 * sızmaz (`form-state.ts`'te karşılığı bile yoktur).
 */

export type EquipmentCategory = components["schemas"]["EquipmentCategory"];
export type EquipmentStatus = components["schemas"]["EquipmentStatus"];
export type EquipmentOwnership = components["schemas"]["EquipmentOwnership"];
export type EquipmentFinancing = components["schemas"]["EquipmentFinancing"];
export type EquipmentRatePeriod = components["schemas"]["EquipmentRatePeriod"];
export type EquipmentFuelType = components["schemas"]["EquipmentFuelType"];
export type EquipmentNormUnit = components["schemas"]["EquipmentNormUnit"];
export type EquipmentMaintenancePeriod =
  components["schemas"]["EquipmentMaintenancePeriod"];

/**
 * Değer taşıyan seçenek — etiket MOCKUP'tan, değer SUNUCU enum'undan gelir
 * (personel formunun `ValueOption` deseni). İkisini tek yerde tutmak etiketin
 * gövdeye sızmasını yapısal olarak imkânsız kılar.
 */
export interface ValueOption<T extends string> {
  value: T;
  label: string;
}

/** Seçicilerin boş seçeneği — mockup "Seçiniz..." (85, 118, 119). */
export const SELECT_PLACEHOLDER = "Seçiniz...";

/* ── Sayfa başlığı / kırıntı yolu (35, 46, 47) ───────────────────────────── */

export const BREADCRUMB_EQUIPMENT = "Makine & Ekipman";
export const BREADCRUMB_CURRENT = "Yeni Ekipman"; // 35
export const BREADCRUMB_CURRENT_EDIT = "Ekipmanı Düzenle"; // düzenleme kipi (K4)
export const EQUIPMENT_LIST_HREF = routes.equipment.list();

export const PAGE_TITLE = "Yeni Makine / Ekipman"; // 46
export const PAGE_TITLE_EDIT = "Makine / Ekipman Düzenle";
export const PAGE_SUBTITLE = "Kendi malımız veya kiralık — sahiplik tipine göre alanlar değişir"; // 47

export const SUBMIT_LABEL = "Ekipmanı Kaydet"; // 39, 171
export const SUBMIT_LABEL_EDIT = "Kaydet";
export const SUBMIT_PENDING_LABEL = "Kaydediliyor…";

/**
 * `is_draft` YOKTUR (spec + MK-1 §2.1): M2'de taslak butonu ÇİZİLMEMİŞTİR ve
 * sunucuda kolonu da yoktur. Personel formundaki taslak yolu buraya
 * KOPYALANMAZ — olmayan bir sunucu durumu için buton basmak yalan olurdu.
 */
export const DRAFT_PENDING_REASON =
  "Ekipman kartında taslak durumu yok — kayıt doğrudan yayına girer";

/* ── Kart 1 · Sahiplik Tipi (50-70) ──────────────────────────────────────── */

export const OWNERSHIP_CARD_TITLE = "🏗 Sahiplik Tipi"; // 51

export interface OwnershipOption {
  value: EquipmentOwnership;
  emoji: string;
  title: string;
  description: string;
}

/** 53-68 — iki seçim kartı. Mockup'ta "Kendi Malımız" seçilidir (54). */
export const OWNERSHIP_OPTIONS: readonly OwnershipOption[] = [
  {
    value: "owned",
    emoji: "🏭", // 56
    title: "Kendi Malımız", // 57
    description: "Şirket varlığı — amortisman hesaplanır, bilançoda görünür", // 58
  },
  {
    value: "rented",
    emoji: "🔑", // 64
    title: "Kiralık", // 65
    description: "Kiralama firmasından — saatlik/günlük kira bedeli ödenir", // 66
  },
];

/* ── Kart 2 · Ekipman Bilgileri (73-92) ──────────────────────────────────── */

export const INFO_CARD_TITLE = "⚙️ Ekipman Bilgileri"; // 74

/** 77-81 — fotoğraf kutusu. Yükleme YOK (belge yüzeyi MK-2'de). */
export const PHOTO_LABEL = "Ekipman Fotoğrafı"; // 80
export const PHOTO_PENDING_REASON =
  "Ekipman fotoğrafı yükleme yüzeyi MK-2 dilimine bırakıldı";

/**
 * 85 — Kategori. Mockup'ın ALTI seçeneği, sunucu enum'una BİREBİR eşlenir
 * (MK-1 §5). Bu seçicide "Seçiniz..." VARDIR (85), yani K5 kapısına GİRMEZ.
 */
export const CATEGORY_OPTIONS: readonly ValueOption<EquipmentCategory>[] = [
  { value: "crane", label: "Vinç / Kule Vinci" },
  { value: "machinery", label: "İş Makinesi (Ekskavatör, Loder)" },
  { value: "truck", label: "Kamyon / Nakliye" },
  { value: "concrete", label: "Beton Ekipmanı" },
  { value: "compressor", label: "Kompresör / Jeneratör" },
  { value: "hand_tool", label: "El Aleti" },
];

/**
 * 86 — mockup TEK alan çiziyor ("Marka / Model") ama sunucuda İKİ kolon var
 * (MK-1 K1: liste ekranı yalnız markayı basıyor, metin parçalamak zorunda
 * kalmasın). **K7 onaylı sapma:** iki ayrı input.
 */
export const BRAND_LABEL = "Marka";
export const MODEL_LABEL = "Model";
export const BRAND_MODEL_SPLIT_NOTE =
  "Mockup'ta tek alan (“Marka / Model”) çizili; sunucuda ayrı kolonlar olduğu için iki alana bölündü.";

/* ── Kart 3 · Mali Bilgiler (95-112) ─────────────────────────────────────── */

export const FINANCE_CARD_TITLE = "💰 Mali Bilgiler"; // 96

/**
 * 100 — Amortisman Süresi. **Boş seçenek YOK** → K5 kapısına girer.
 * Mockup'ta `selected` olan seçenek `10 Yıl`dır (100).
 * Değer SERBEST TAMSAYIDIR (MK-1 §2.1), enum değil: düzenleme kipinde
 * sunucudan gelen üçlü dışı bir yıl KIRPILMAZ, kendi seçeneği eklenir.
 */
export const DEPRECIATION_YEAR_OPTIONS: readonly ValueOption<string>[] = [
  { value: "5", label: "5 Yıl" },
  { value: "10", label: "10 Yıl" },
  { value: "15", label: "15 Yıl" },
];
export const DEPRECIATION_YEARS_DEFAULT = "10"; // 100 `selected`

/** 102 — Kredi ile Alındı mı? **Boş seçenek YOK** → K5 kapısına girer. */
export const FINANCING_OPTIONS: readonly ValueOption<EquipmentFinancing>[] = [
  { value: "cash", label: "Hayır — Peşin" },
  { value: "bank_loan", label: "Evet — Banka Kredisi" },
  { value: "leasing", label: "Evet — Leasing" },
];

/** 109 — Kira Tipi. **Boş seçenek YOK** → K5 kapısına girer. */
export const RATE_PERIOD_OPTIONS: readonly ValueOption<EquipmentRatePeriod>[] = [
  { value: "hourly", label: "Saatlik" },
  { value: "daily", label: "Günlük" },
  { value: "monthly", label: "Aylık Sabit" },
];

/** 108 — Kiralama Firması seçicisinin BOŞ seçeneği (bu yüzden K5 kapısı dışı). */
export const NO_SUPPLIER_LABEL = "— (Kendi malımız)";

/** 106 — kiralık bloğunun başlığı. */
export const RENT_BLOCK_TITLE = "Kiralık ise — Kira Bilgileri";

/** 103 — ipucu metni mockup'tan AYNEN. */
export const MARKET_VALUE_HINT = "Varlık raporunda kullanılır";

/**
 * 101 (serbest metin "Tedarikçi / Satıcı") ve 108 (select "Kiralama Firması")
 * mockup'ta İKİ alandır ama MK-1 K3 gereği TEK `supplier_id`dir: iki alan
 * tutulsaydı aynı firma iki kez yazılır, tedarikçi bakiyesi ikiye bölünürdü.
 * İki kontrol de AYNI form durumunu okur/yazar — ikinci bir state YOKTUR.
 */
export const SUPPLIER_SHARED_NOTE =
  "Satıcı ve kiralama firması TEK tedarikçi kaydıdır — iki alan da aynı firmayı doldurur.";

/* ── Kart 4 · Kullanım & Atama (115-125) ─────────────────────────────────── */

export const USAGE_CARD_TITLE = "📍 Kullanım & Atama"; // 116

/**
 * 118 — mockup etiketi "Atandığı Proje", sunucudaki alan `site_id`dir
 * (K6 / MK-1 K4: M5:89 aynı sütuna "Şantiye" diyor). Etiket sadakat gereği
 * KORUNUR, veri kaynağı doğru olandır. **Onaylı sapma.**
 */
export const SITE_FIELD_LABEL = "Atandığı Proje";
export const SITE_FIELD_NOTE =
  "Ekipman ŞANTİYEYE atanır (sunucuda `site_id`); etiket mockup'tan korunmuştur.";
/** 118 — son seçenek; `site_id = null` demektir. */
export const UNASSIGNED_SITE_LABEL = "Depoda (Atanmadı)";

/** 119 — ipucu metni mockup'tan AYNEN. */
export const OPERATOR_HINT = "Operatör belgesi kontrol edilir";

/** 120 — Durum. Boş seçenek YOK ama sunucuda **NOT NULL** (ezilecek `null` yok). */
export const STATUS_OPTIONS: readonly ValueOption<EquipmentStatus>[] = [
  { value: "working", label: "Çalışıyor" },
  { value: "maintenance", label: "Bakımda" },
  { value: "broken", label: "Arızalı" },
  { value: "idle", label: "Boşta" },
];

/** 121 — Yakıt Tipi. **Boş seçenek YOK** ("—" = `none` enum'u) → K5 kapısı. */
export const FUEL_TYPE_OPTIONS: readonly ValueOption<EquipmentFuelType>[] = [
  { value: "diesel", label: "Motorin" },
  { value: "gasoline", label: "Benzin" },
  { value: "electric", label: "Elektrik" },
  { value: "none", label: "—" },
];

/**
 * 122 — mockup TEK serbest metin çiziyor ("4,2 Lt/saat") ama MK-1 K5 sayıyı ve
 * birimi AYIRIR (M4 bunun üzerinden yüzde sapma hesaplıyor; metin saklansaydı
 * hesap her okumada metin ayrıştırmaya bağlı olurdu). **Onaylı sapma:** iki
 * kontrol. Birim seçicisinin boş seçeneği YOKTUR → K5 kapısına girer.
 */
export const NORM_CONSUMPTION_HINT = "Anormal tüketim uyarısı için"; // 122
export const NORM_UNIT_LABEL = "Norm Birimi";
export const NORM_SPLIT_NOTE =
  "Mockup'ta tek serbest metin (“4,2 Lt/saat”) çizili; sapma hesabı sayı + birim istediği için iki kontrole bölündü.";
export const NORM_UNIT_OPTIONS: readonly ValueOption<EquipmentNormUnit>[] = [
  { value: "lt_hour", label: "Lt/saat" },
  { value: "lt_km", label: "Lt/km" },
];

/** 123 — Bakım Periyodu. **Boş seçenek YOK** → K5 kapısına girer. */
export const MAINTENANCE_PERIOD_OPTIONS: readonly ValueOption<EquipmentMaintenancePeriod>[] =
  [
    { value: "hours_250", label: "250 Saat" },
    { value: "hours_500", label: "500 Saat" },
    { value: "hours_1000", label: "1000 Saat" },
    { value: "monthly", label: "Aylık" },
  ];
/** 123 `selected` — mockup'ın gösterdiği değer. */
export const MAINTENANCE_PERIOD_DEFAULT: EquipmentMaintenancePeriod = "hours_500";

/* ── Kart 5 · Ekipman Belgeleri (128-162) ────────────────────────────────── */

export const DOCUMENTS_CARD_TITLE = "📎 Ekipman Belgeleri"; // 129
export const DOCUMENTS_CARD_NOTE = "yakında";
/**
 * MK-1 §9.2: belge yüzeyi bilerek MK-2'ye bırakıldı — mockup "Periyodik
 * Muayene · Yıllık zorunlu" için GEÇERLİLİK TARİHİ alanı çizmiyor; tarihsiz
 * saklanan belge süresi dolmuş muayeneyi "var" gösterirdi.
 */
export const DOCUMENTS_PENDING_REASON =
  "Ekipman belgeleri MK-2'de açılacak — mockup'ta belge geçerlilik tarihi alanı yok";

/** 131-160 — altı kutu, İKİ sütun (130). Zeminler token'dan (çıplak hex yok). */
export const EQUIPMENT_DOCUMENTS: readonly DocumentPlaceholderItem[] = [
  {
    emoji: "📄", // 133
    iconBg: "var(--color-danger-soft)", // #fee2e2
    title: "Fatura / Kira Sözleşmesi", // 134
    subtitle: "Alış faturası veya kira sözleşmesi",
  },
  {
    emoji: "🛡", // 138
    iconBg: "var(--color-warning-soft)", // #fef3c7
    title: "Periyodik Muayene Raporu", // 139
    subtitle: "İSG mevzuatı · Yıllık zorunlu",
  },
  {
    emoji: "📋", // 143
    iconBg: "var(--color-primary-soft)", // #dbeafe
    title: "CE Belgesi / Uygunluk", // 144
    subtitle: "Üretici uygunluk beyanı",
  },
  {
    emoji: "🔧", // 148
    iconBg: "var(--color-success-soft)", // #dcfce7
    title: "Kullanım Kılavuzu", // 149
    subtitle: "Bakım talimatları",
  },
  {
    emoji: "🏥", // 153
    iconBg: "var(--color-accent-purple-soft)", // #ede9fe
    title: "Sigorta Poliçesi", // 154
    subtitle: "Kasko / makine kırılması",
  },
  {
    emoji: "📷", // 158
    iconBg: "var(--color-success-tint)", // #f0fdf4
    title: "Teslim Fotoğrafları", // 159
    subtitle: "Kiralıkta hasar tespiti için",
  },
];

/* ── Alt şerit (164-173) ─────────────────────────────────────────────────── */

/** 167 — MK-1 K8: YALNIZ BİR İŞARET, hiçbir yan etkisi yok (sabit kıymet modülü yok). */
export const COMPANY_ASSET_LABEL = "Şirket varlıklarına otomatik eklensin";

/**
 * 🔴 `EquipmentCreate.model_year` — sözleşme aralığı **1900..2200**
 * (`form-limits.contract.test.ts` ölçer). İstemcide HİÇ denetlenmiyordu:
 * "202" ya da "20222" gibi bir yazım hatası sunucudan UYARISIZ 422 döndürüyordu.
 */
export const MODEL_YEAR_MIN = 1900;
export const MODEL_YEAR_MAX = 2200;
