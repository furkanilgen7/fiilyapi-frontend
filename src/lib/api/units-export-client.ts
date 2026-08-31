import { downloadExport } from "@/lib/api/download";

// F-PKK T1 · KKP 24 "Excel" — Kat Karşılığı Paylaşım tablosunun Excel çıktısı.
//
// 🔴 EXPORT-XLSX (2026-08-31) — BU DOSYA ESKİDEN ŞUNU YAZIYORDU: *"ORTAK bir
// `downloadBlob` yardımcısı ÇIKARILMAZ: üç emsalin de kendi yol kurucusu, kendi
// `toBackendError`ı ve kendi varsayılan adı vardır."* O karar ÖLÇÜMLE
// ÇÜRÜTÜLDÜ: gövde DOKUZ istemcide birebir aynıydı ve altı yeni dışa aktarma
// ucu sayıyı on beşe çıkaracaktı. Yardımcı yalnız DEĞİŞMEYEN kısmı (blob →
// objectURL → `<a download>` → `finally revokeObjectURL`) sarar; yol kurucusu,
// varsayılan ad ve süzgeç kararı HÂLÂ bu dosyanındır.
//
// ⚠️ BFF İZİN LİSTESİ: ucun ilk segmenti `projects`tır ve o kök `ALLOWED_ROOTS`ta
// ZATEN tanımlıdır. 🔴 `units` diye YENİ BİR KÖK EKLENMEZ
// (`units-import-client.ts` aynı kararı yazar).
//
// ⚠️ İKİLİ DAL: BFF `isBinaryResponse` kararını önce SON SEGMENTten verir ve
// `export.xlsx` `BINARY_DOWNLOAD_SUFFIXES` (`.xlsx`) ile biter → gövde ham
// geçer, JSON'a çevrilmez.

const DEFAULT_EXPORT_FILENAME = "paylasim-tablosu.xlsx";

/** `projectId` UUID beklenir ama rota parametresi KULLANICI GİRDİSİDİR. */
function unitsExportPath(projectId: string): string {
  return `/api/backend/projects/${encodeURIComponent(projectId)}/units/export.xlsx`;
}

/**
 * Excel dosyasını BFF üzerinden indirir. Uç şemada olsa da bilinçli olarak ham
 * `fetch` kullanılır: openapi-fetch yanıtı içerik tipine göre JSON/metin olarak
 * çözer ve ikili gövde (xlsx) için `Blob` vermez.
 *
 * BFF ikili/JSON kararını `Content-Type`tan verir ve `status >= 400` HER ZAMAN
 * JSON dalına gider — bu yüzden 403/404/422 gövdeleri `BackendError` olarak
 * okunabilir.
 *
 * 🔴 SÜZGEÇ ALMAZ. Uç açıklaması gerekçeyi kendi yazıyor: *"SUZGEC ALMAZ …
 * KKP'nin Excel dugmesi paylasim tablosunun TAMAMINI indirir; kismi dosya,
 * tfoot toplamlariyla (proje geneli) celisen bir belge uretirdi."* Ekranın
 * sahip/blok süzgeçleri bu çağrıya SIZMAZ.
 *
 * Token yalnızca httpOnly cookie'de kalır — URL'e imzalı token/parametre
 * KOYULMAZ, istek `credentials: "same-origin"` ile gider.
 */
export async function downloadUnitsExport(projectId: string): Promise<void> {
  await downloadExport(unitsExportPath(projectId), DEFAULT_EXPORT_FILENAME);
}
