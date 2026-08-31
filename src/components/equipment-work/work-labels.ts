// F-MK T4 · M3'ün rotası/ucu olmayan öğelerinin GÖRÜNÜR Türkçe gerekçeleri.
// Kalıcı kural (F-TH emsali): mockup öğesi SİLİNMEZ, devre-dışı + gerekçe
// basılır. Metinler tek kaynaktan gelir — ekranlar cümle KOPYALAMAZ.

/** M3:49 · spec K10 — form mockup'ı yok, uç açık ama form İCAT EDİLMEZ. */
export const ADD_RECORD_DISABLED_REASON =
  "Çalışma kaydı giriş formunun mockup'ı henüz yok.";

/** M3:48 — çalışma kayıtları için sunucu üretimli bir dışa aktarma ucu YOK. */
/**
 * 🔴 EXPORT-XLSX (2026-08-31) — `GET /equipment/work-summary/export.xlsx`
 * AÇILDI; düğme gerçek ve eski `EXPORT_DISABLED_REASON` KALDIRILDI (metin
 * artık yalan söylerdi).
 */
export const EXPORT_ERROR_FALLBACK = "Çalışma kaydı Excel dosyası indirilemedi.";

/** M3:62-63 — sunucu özeti YALNIZ aylıktır (`year`+`month` zorunlu). */
export const VIEW_MODE_DISABLED_REASON =
  "Özet ucu yalnız aylık dönem veriyor; haftalık/günlük görünüm sunucuda henüz yok.";

/** M3:65-70 — `GET /equipment/work-summary` ekipman süzgeci ALMIYOR. */
export const EQUIPMENT_FILTER_DISABLED_REASON =
  "Özet ucu ekipman süzgeci almıyor; süzülmüş bir toplam üretilemez.";

/** M3:250 — tüm kayıtları listeleyen ayrı bir ekran/rota yok. */
export const RECENT_ALL_DISABLED_REASON =
  "Tüm çalışma kayıtları ekranının mockup'ı henüz yok.";

/** M3:83 — sunucu önceki ay karşılaştırması vermiyor; istemcide UYDURULMAZ. */
export const MONTH_OVER_MONTH_MISSING_REASON =
  "Geçen ay karşılaştırması sunucuda yok.";
