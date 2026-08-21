/**
 * F-UNIT2 · EI (`Form - Unite Excel Import.dc.html`) — "Excel'den Ünite İçe
 * Aktarma" ekranının sabitleri. Parantez içi `EI nn` O DOSYANIN satırıdır.
 *
 * 🔴 BU DOSYANIN EN ÖNEMLİ İŞİ: MOCKUP METNİ SUNUCUYLA İKİ YERDE ÇELİŞİYOR ve
 * ekran GERÇEĞİ yazar.
 *
 * | Mockup | Gerçek (`backend/app/modules/units/importer.py`) |
 * |---|---|
 * | EI 76 `accept=".xlsx,.xls,.csv"` | yalnız `.xlsx` — `ensure_xlsx`: *"`.xls` / `.csv` REDDEDILIR (spec §7.8): `openpyxl` yalniz `.xlsx` okur"* |
 * | EI 79 "XLSX, XLS veya CSV · Maks 10 MB" | Maks **2 MB** (`MAX_IMPORT_BYTES`) |
 * | — (mockup'ta hiç geçmez) | en fazla **1000 satır** (`MAX_IMPORT_ROWS`) |
 *
 * Mockup birebir basılsaydı kullanıcı `.csv` seçer, 8 MB'lık dosyayı yükler ve
 * reddedilirdi — sessiz tuzak. F-UNIT1'in "Maliyet" emsali bu sınıfı çözer
 * (*"mockup'ta var, şemada yok → önce koddaki gerekçeyi ara; yoklukla kararı
 * karıştırma"*): sunucu kararı BİLİNÇLİDİR (spec §7.8), dolayısıyla ekran
 * gerçeği yazar. ONAYLI SAPMA olarak raporlanır.
 */

/** EI 53 · 54 */
export const IMPORT_FORM_TITLE = "Excel'den Ünite İçe Aktarma"; // EI 53
export const IMPORT_FORM_SUBTITLE =
  "Şablonu indirip doldurun, sonra yükleyin — sistem satır satır doğrular"; // EI 54

export const IMPORT_FILE_CARD_TITLE = "Dosya Seçimi"; // EI 58
export const IMPORT_VALIDATION_CARD_TITLE = "Doğrulama Sonucu"; // EI 93
export const IMPORT_ROWS_CARD_TITLE = "Satır Detayları"; // EI 108

export const IMPORT_PROJECT_LABEL = "Hedef Proje"; // EI 60 — PATH parametresi
export const IMPORT_SITE_LABEL = "Hedef Şantiye"; // EI 61 — GERÇEK gövde alanı

/**
 * 🔴 TU'nun aksine burada şantiye GÖVDEYE GİRER (`site_id`), çünkü içe
 * aktarma dosyada geçen ama projede olmayan blokları AÇAR ve yeni bloğun
 * şantiyesi bu alandan gelir (`router.py`: *"YALNIZ yeni blok acarken
 * kullanilir"*). İki ekranı aynı sanmak sessiz hata olurdu.
 */
export const IMPORT_SITE_HINT = "Yalnızca dosyada geçen YENİ bloklar açılırken kullanılır";

/** EI 75-80 — dosya bırakma alanı. */
export const IMPORT_DROPZONE_LABEL = "Başka bir dosya yüklemek için tıklayın veya sürükleyin"; // EI 78
export const IMPORT_TEMPLATE_LABEL = "Şablon İndir"; // EI 37/87
export const IMPORT_EXPECTED_COLUMNS_LABEL = "Beklenen kolonlar:"; // EI 85

/** EI 191-195 · 199-202 */
export const IMPORT_INCLUDE_WARNINGS_LABEL = "Uyarılı satırları da aktar"; // EI 193
export const IMPORT_ERROR_REPORT_LABEL = "Hata Raporunu İndir"; // EI 195
export const IMPORT_REVALIDATE_LABEL = "Yeniden Doğrula"; // EI 201
export const IMPORT_SUBMIT_LABEL = "Geçerli Satırları Aktar"; // EI 202 (sayı TÜREVDİR)
export const IMPORT_CANCEL_LABEL = "İptal"; // EI 200

/** EI 95-98 dört sayaç. */
export const IMPORT_TOTAL_ROWS_LABEL = "Toplam Satır"; // EI 95
export const IMPORT_VALID_LABEL = "Geçerli"; // EI 96
export const IMPORT_WARNING_LABEL = "Uyarı"; // EI 97
export const IMPORT_ERROR_LABEL = "Hata"; // EI 98

/** EI 110-112 süzgeç düğmeleri. */
export const IMPORT_FILTER_ALL_LABEL = "Tümü"; // EI 110
export const IMPORT_FILTER_ERROR_LABEL = "Hatalı"; // EI 111
export const IMPORT_FILTER_WARNING_LABEL = "Uyarılı"; // EI 112

/** EI 118-126 tablo başlıkları — `UnitImportRowReport` alanlarıyla BİREBİR. */
export const IMPORT_ROW_COLUMN_LABELS: readonly string[] = [
  "Satır", // EI 118
  "Durum", // EI 119
  "Ünite No", // EI 120
  "Blok", // EI 121
  "Kat", // EI 122
  "Tip", // EI 123
  "Brüt m²", // EI 124
  "Liste Fiyatı", // EI 125
  "Mesaj", // EI 126
];

// --- Sunucu sınırları (`importer.py`) — sayı VE metin ORADAN kopyadır ---

/** 🔴 `ensure_xlsx`: `openpyxl` yalnız `.xlsx` okur. EI 76 YANLIŞTIR. */
export const IMPORT_ACCEPT = ".xlsx";

/** 🔴 `MAX_IMPORT_BYTES = 2 * 1024 * 1024`. EI 79'un "10 MB"ı YANLIŞTIR. */
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;

/** 🔴 `MAX_IMPORT_ROWS`. Mockup'ta hiç geçmez ama sunucu zorlar. */
export const IMPORT_MAX_ROWS = 1000;

export const IMPORT_BAD_TYPE_MESSAGE = "Yalnızca .xlsx dosyası yüklenebilir"; // `IMPORT_BAD_TYPE`
export const IMPORT_TOO_LARGE_MESSAGE = "Dosya çok büyük (en fazla 2 MB)"; // `IMPORT_TOO_LARGE`
export const IMPORT_TOO_MANY_ROWS_MESSAGE = `Dosyada en fazla ${IMPORT_MAX_ROWS} satır olabilir`; // `IMPORT_TOO_MANY_ROWS`

/** EI 79'un yerine geçen GERÇEK ipucu — üç sınırı da söyler. */
export const IMPORT_FILE_HINT = `XLSX · Maks 2 MB · en fazla ${IMPORT_MAX_ROWS} satır`;

/**
 * EI 85 beklenen kolonlar — `importer.py::COLUMNS` ile BİREBİR ve AYNI
 * SIRADA. Sıra sunucuda *"DEGISTIRILEMEZ"* diye kayıtlıdır: eksik başlık
 * mesajı ve `.xlsx` şablonu bu sırayla üretilir.
 */
export const IMPORT_EXPECTED_COLUMNS: readonly string[] = [
  "Blok", // block_name (zorunlu)
  "Kat", // floor
  "Ünite No", // unit_no (zorunlu)
  "Tür", // unit_kind (zorunlu)
  "Oda Tipi", // layout (zorunlu)
  "Brüt m²", // gross_area_m2 (zorunlu)
  "Net m²", // net_area_m2
  "Cephe", // facing
  "Liste Fiyatı", // list_price
  "Rayiç Değer", // appraisal_value
  "Maliyet", // 🔴 okunur, SAKLANMAZ — aşağıdaki nota bak
  "Sahiplik", // owner_side
];

/**
 * 🔴 TU 104 ile EI'nin "Maliyet"i AYNI ŞEY DEĞİLDİR ve ekran metni bunları
 * karıştırmamalıdır. TU'da sütun ekranda vardır ama sunucuda karşılığı YOKTUR
 * (karar 3). EI'de kolon KABUL EDİLİR, okunur, EI 173 uyarısını üretir ve
 * ATILIR: `importer.py` *"`Maliyet` YEREL bir degiskendir (karar 10): yalniz
 * EI 173 uyarisini uretir"*. `units` tablosunda kolonu yine AÇILMAZ.
 */
export const IMPORT_COST_COLUMN_NOTE =
  "Maliyet kolonu okunur ve yalnızca 'fiyat maliyetin altında' uyarısını üretir — üniteye saklanmaz";

/**
 * 🔴 İSTEMCİ ÖN KONTROLÜ TEK SAVUNMA HATTI DEĞİLDİR. `file-check.ts`
 * kullanıcıya sebebi boşuna bir yüklemeden ÖNCE söylemek içindir; sunucu
 * `ensure_xlsx` + `ensure_size` ile AYNI kontrolleri yeniden yapar ve boyutu
 * İKİ KEZ ölçer (bildirilen uzunluk, sonra gerçekten okunan baytlar).
 * İstemci "dosya bana uygun göründü" diye bir sunucu hatasını ASLA
 * bastırmaz — hata olduğu gibi basılır.
 */
export const IMPORT_SERVER_RECHECK_NOTE =
  "Bu kontrol yalnız ön elemedir; dosyayı sunucu yeniden doğrular ve son söz sunucunundur";

/** EI 101 — hiç geçerli satır yokken basılan başlık. */
export const IMPORT_NOTHING_IMPORTABLE_MESSAGE =
  "Aktarılabilecek satır yok — dosyayı düzeltip yeniden yükleyin";

/** Boş dosya (başlık var, veri satırı yok). */
export const IMPORT_EMPTY_FILE_MESSAGE =
  "Dosyada veri satırı bulunamadı — şablonu doldurup yeniden yükleyin";

/**
 * `valid + warning + error == total_rows` bozulursa basılan metin. Sessizce
 * çizmek yasaktır: sayaçlar tutmuyorsa ekrandaki tablo da güvenilmez.
 */
export const IMPORT_SUMMARY_INCONSISTENT_MESSAGE =
  "Doğrulama özeti tutarsız — sayaçlar toplam satır sayısını tutmuyor";
