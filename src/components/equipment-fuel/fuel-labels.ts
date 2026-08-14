// F-MK T5 · M4'ün rotası/ucu olmayan öğelerinin GÖRÜNÜR Türkçe gerekçeleri.
// Kalıcı kural (F-TH emsali, T4'te de uygulandı): mockup öğesi SİLİNMEZ,
// devre-dışı + gerekçe basılır. Metinler tek kaynaktan gelir.

/** M4:22 · spec K10 — form mockup'ı yok, uç açık ama form İCAT EDİLMEZ. */
export const ADD_FUEL_ENTRY_DISABLED_REASON = "Yakıt girişi formunun mockup'ı henüz yok.";

/**
 * M4:72-91 "Aylık Yakıt Trendi" paneli — `GET /equipment/fuel-summary` yalnız
 * TEK bir yıl/ay alır; altı aylık geçmiş seri veren bir uç YOK. İstemcide altı
 * ayrı ay için altı istek atıp seri UYDURMAK bu dilimin kapsamı DEĞİL (yeni
 * bir tasarım kararı ister) — panel yapısı korunur, içerik devre-dışı basılır.
 */
export const TREND_DISABLED_REASON =
  "Aylık yakıt trendi ucu sunucuda yok; yalnız seçili ay/yıl özeti veriliyor.";

/**
 * M4:113,124-155 "Tüketim" sütunu — `FuelLogResponse` kayıt başına saat/norm/
 * sapma TAŞIMAZ; bu hesap yalnız AYLIK ekipman özetinde (`FuelSummaryRow`)
 * vardır. Ekipmanın aylık rozetini tek bir güne İĞNELEMEK o günü yanlış
 * etiketler (K16 fail-closed ruhu) — sütun başlığı kalır, hücre "—" + gerekçe
 * basar.
 */
export const PER_LOG_CONSUMPTION_REASON =
  "Kayıt başına tüketim/sapma ucu sunucuda yok; aylık ekipman bazlı özet yukarıdaki listede.";
