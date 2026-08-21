/**
 * F-UNIT2 · TU (`Form - Toplu Unite.dc.html`) — "Toplu Ünite Üretimi"
 * ekranının sabitleri. Parantez içi `TU nn` O DOSYANIN satır numarasıdır.
 *
 * 🔴 SEÇENEK LİSTELERİ YENİDEN TANIMLANMAZ. Cephe / ünite türü / oda tipi
 * listeleri F-UNIT1'de zaten kuruldu ve orada ONAYLI SAPMA kararları taşıyorlar
 * (`FACING_OPTIONS` beş üyelidir, mockup dört çizer). İkinci bir kopya yazmak
 * iki listeyi zamanla ayrıştırırdı — `unit-shell/routes.ts`in var oluş
 * gerekçesiyle aynı sınıf. Burada YALNIZ yeniden dışa verilirler; testi kimlik
 * (`toBe`) karşılaştırmasıdır, içerik değil.
 */

import type { components } from "@/lib/api/schema";

export {
  FACING_OPTIONS,
  UNIT_KIND_OPTIONS,
  UNIT_LAYOUT_OPTIONS,
} from "@/components/unit-form/constants";
export type { UnitOption } from "@/components/unit-form/constants";

import type { UnitOption } from "@/components/unit-form/constants";

export type UnitNumberingPattern = components["schemas"]["UnitNumberingPattern"];
export type UnitKind = components["schemas"]["UnitKind"];
export type UnitFacing = components["schemas"]["UnitFacing"];

export const BULK_FORM_TITLE = "Toplu Ünite Üretimi"; // TU 55
export const BULK_FORM_SUBTITLE =
  "Kat aralığı ve numaralandırma deseni girin — sistem tüm üniteleri otomatik oluşturur"; // TU 56

export const BULK_TARGET_CARD_TITLE = "Hedef Blok"; // TU 59
export const BULK_RULES_CARD_TITLE = "Üretim Kuralları"; // TU 68
export const BULK_SLOT_CARD_TITLE = "Kat Şablonu"; // TU 93
export const BULK_SLOT_CARD_HINT = "Her katta aynı düzen tekrarlanır"; // TU 94
export const BULK_PREVIEW_CARD_TITLE = "Üretim Önizlemesi"; // TU 145

export const BULK_PROJECT_LABEL = "Proje"; // TU 61 — PATH parametresi
export const BULK_SITE_LABEL = "Şantiye"; // TU 62 — YALNIZ süzgeç
export const BULK_BLOCK_LABEL = "Blok"; // TU 63
export const BULK_START_FLOOR_LABEL = "Başlangıç Katı"; // TU 70
export const BULK_END_FLOOR_LABEL = "Bitiş Katı"; // TU 71
export const BULK_UNITS_PER_FLOOR_LABEL = "Kat Başına Daire"; // TU 72
export const BULK_TOTAL_LABEL = "Toplam Üretilecek"; // TU 73 — TÜREV, alan değil
export const BULK_NUMBERING_LABEL = "Numaralandırma Deseni"; // TU 79
export const BULK_NUMBERING_HINT = "Süslü parantez içindekiler otomatik doldurulur"; // TU 80
export const BULK_START_NUMBER_LABEL = "Başlangıç Numarası"; // TU 84
export const BULK_START_NUMBER_HINT = "Mevcut ünitelerle çakışmaması için"; // TU 85

/**
 * 🔴 MOCKUP + BİR — TU'da kutusu YOKTUR ama `unit_kind` sunucuda hem üretilmiş
 * tipte ZORUNLU hem sütunda NOT NULL'dır. Sabit `apartment` gömmek
 * `shop`/`office`/`warehouse`/`parking` türlerini toplu üretimden ULAŞILMAZ
 * kılardı — F-UNIT1'in `west` cephesinde reddettiği kusurun aynısı.
 */
export const BULK_UNIT_KIND_LABEL = "Ünite Türü";
export const BULK_UNIT_KIND_HINT = "Üretilen tüm üniteler bu türde açılır";

/** TU 98-103 — kat şablonu tablosunun düzenlenebilir sütun başlıkları. */
export const BULK_SLOT_SEQUENCE_LABEL = "Sıra"; // TU 98
export const BULK_SLOT_LAYOUT_LABEL = "Oda Tipi"; // TU 99
export const BULK_SLOT_GROSS_LABEL = "Brüt m²"; // TU 100
export const BULK_SLOT_NET_LABEL = "Net m²"; // TU 101
export const BULK_SLOT_FACING_LABEL = "Cephe"; // TU 102
export const BULK_SLOT_LIST_PRICE_LABEL = "Liste Fiyatı (₺)"; // TU 103

/**
 * 🔴 TU 104 "Maliyet (₺)" — KARAR 3 (`units/models.py`: *"Maliyet sutunu
 * ACILMAZ (karar 3, spec §4.5): maliyet ileride Is Kalemleri/satinalmadan
 * otomatik hesaplanacaktir"*). `UnitBulkSlot`ta karşılığı da yoktur ve
 * kod yorumu bunu ayrıca yazar (*"TU 104 'Maliyet' sutunu BILEREK YOKTUR"*).
 *
 * F-UNIT1'in UE 91 emsali AYNEN uygulanır: sütun SİLİNMEZ, salt-okunur/devre
 * dışı + GÖRÜNÜR gerekçeyle basılır ve `form-state.ts`te KARŞILIĞI YOKTUR —
 * gövdeye sızması yapısal olarak imkânsızdır.
 *
 * ⚠️ EI'nin "Maliyet" kolonuyla AYNI ŞEY DEĞİLDİR: içe aktarmada kolon
 * OKUNUR ama SAKLANMAZ (yalnız EI 173 uyarısını üretir). Ekran metni ikisini
 * karıştırmamalıdır.
 */
export const BULK_UNIT_COST_LABEL = "Maliyet (₺)"; // TU 104
export const BULK_UNIT_COST_HINT = "Kâr hesabı için"; // UE 91 emsali
export const BULK_UNIT_COST_PENDING_REASON =
  "Ünite maliyeti elle girilmez — proje maliyet modülünden (İş Kalemleri / satınalma) otomatik hesaplanacak";

/** TU 137-138 — üst katlarda fiyat artışı. */
export const BULK_PRICE_INCREASE_LABEL = "Üst katlarda fiyat artışı uygula"; // TU 137
export const BULK_PRICE_INCREASE_PREFIX = "Kat başına"; // TU 138
export const BULK_PRICE_INCREASE_SUFFIX = "% artış"; // TU 138

export const BULK_SUBMIT_LABEL = "Üniteleri Oluştur"; // TU 40/183 (sayı TÜREVDİR)
export const BULK_PREVIEW_LABEL = "Önizlemeyi Yenile"; // TU 182
export const BULK_CANCEL_LABEL = "İptal"; // TU 39/181

/**
 * TU 177 dikkat kutusu. Mockup'ta çıplak `⚠` ile başlar; glif bekçisi çıplak
 * hâli yasaklar, VS16'lı `⚠️` serbesttir.
 */
export const BULK_WARNING_TEXT =
  "Oluşturulan üniteler daha sonra tek tek düzenlenebilir. Mevcut ünite numaraları ile çakışma varsa uyarı verilir."; // TU 177

/**
 * 🔴 TU 146/171-172 "₺27.264.000" İSTEMCİDE HESAPLANMAZ. `bulk.py`
 * `total_list_value` docstring'i bunu kaydetmiş: *"Mockup'in ₺27.264.000
 * sayisi KANON DEGILDIR ve hedeflenmez"*. Ünite sayısı (24 = 8 × 3) tutarlıdır
 * ama PARA toplamı mockup'ın kendi satırlarıyla çelişir. Toplam değer
 * `UnitBulkPreview.total_list_value` ile SUNUCUDAN gelir ve olduğu gibi basılır.
 */
export const BULK_TOTAL_VALUE_LABEL = "Toplam Liste Değeri"; // TU 171

/**
 * TU 79'un DÖRT deseni + korunan `sequential`.
 *
 * 🔴 ONAYLI SAPMA — MOCKUP + BİR: mockup dört desen çizer ama `UnitNumberingPattern`
 * BEŞ üyelidir ve beşincisi (`sequential`) şemanın VARSAYILANIDIR. Dördünü
 * basmak, bugün çalışan `sequential` üretimini UI'dan ULAŞILMAZ kılardı
 * (`schemas.py`: *"dort desene indirgemek onu sessizce kirardi"*). Beşincinin
 * etiketi mockup'ın KENDİ jeton dilinde yazılır; ilk dördü TU 79'dan BİREBİRDİR.
 *
 * 🔴 `{Sıra}` jetonu İKİ ANLAMLIDIR (`bulk.py::_unit_no`): `sequential` /
 * `block_sequence` / `label_sequence` üretim boyunca artan GLOBAL sırayı,
 * `floor_sequence` / `block_floor_sequence` ise KAT İÇİ slot sırasını kullanır.
 * Etiketlerin örnekleri (C-1, C-2, C-3 · 11, 12, 13, 21) bu farkı zaten gösterir.
 */
export const NUMBERING_OPTIONS: readonly UnitOption<UnitNumberingPattern>[] = [
  { value: "block_sequence", label: "{Blok}-{Sıra} → C-1, C-2, C-3..." }, // TU 79 (`selected`)
  { value: "floor_sequence", label: "{Kat}{Sıra} → 11, 12, 13, 21, 22..." }, // TU 79
  { value: "label_sequence", label: "Daire {Sıra} → Daire 1, Daire 2..." }, // TU 79
  { value: "block_floor_sequence", label: "{Blok}{Kat}{Sıra} → C11, C12, C13..." }, // TU 79
  { value: "sequential", label: "{Sıra} → 1, 2, 3..." }, // mockup'ta YOK — şema varsayılanı
];

/**
 * Sunucu sınırları (`units/schemas.py`). Sayılar VE metinler oradan kopyadır;
 * yeniden yazılırsa iki yerde yaşayan bir eşik doğar ve zamanla ayrışır.
 */
export const BULK_MAX_UNITS = 500; // `_MAX_BULK_UNITS`
export const BULK_UNITS_PER_FLOOR_MIN = 1; // `units_per_floor: Field(ge=1, le=20)`
export const BULK_UNITS_PER_FLOOR_MAX = 20;

export const BULK_RANGE_INVALID_MESSAGE = "Bitiş katı başlangıç katından küçük olamaz";
export const BULK_MAX_UNITS_MESSAGE = `Tek seferde en fazla ${BULK_MAX_UNITS} ünite üretilebilir`;

/**
 * ⚠️ Bu metnin sunucuda BİREBİR karşılığı YOKTUR: `units_per_floor` sınırı
 * Pydantic `Field(ge=1, le=20)` ile zorlanır ve 422 gövdesi genel bir
 * doğrulama hatasıdır. Kullanıcıya okunur bir cümle göstermek için BURADA
 * yazıldı; sayılar yine sunucu sınırlarından türer.
 */
export const BULK_UNITS_PER_FLOOR_MESSAGE = `Kat başına daire ${BULK_UNITS_PER_FLOOR_MIN} ile ${BULK_UNITS_PER_FLOOR_MAX} arasında olmalı`;

/** TU 73 kutusunda değer yokken basılan metin (UE 89 emsali). */
export const BULK_EMPTY_TOTAL = "—";
