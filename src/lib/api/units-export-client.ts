import { BackendError } from "@/lib/api/unwrap";
import { exportFilename } from "@/lib/api/export-filename";

// F-PKK T1 · KKP 24 "Excel" — Kat Karşılığı Paylaşım tablosunun Excel çıktısı.
// `timesheet-client.ts` / `purchase-quote-client.ts` / `audit-client.ts` kanonu
// BİREBİR izlenir — yeni indirme deseni İCAT EDİLMEZ (WORKFLOW §4: ikili
// indirme `Content-Type` tabanlı, `status >= 400` HER ZAMAN JSON dalı).
// 🔴 ORTAK bir `downloadBlob` yardımcısı ÇIKARILMAZ: üç emsalin de kendi yol
// kurucusu, kendi `toBackendError`ı ve kendi varsayılan adı vardır; tek fark
// yaratan `exportFilename` ZATEN paylaşılmıştır.
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

async function toBackendError(response: Response): Promise<BackendError> {
  const body = await response.json().catch(() => null);
  return new BackendError(response.status, body);
}

/**
 * Excel dosyasını BFF üzerinden indirir. Uç şemada olsa da burada bilinçli
 * olarak ham `fetch` kullanılır: openapi-fetch yanıtı içerik tipine göre
 * JSON/metin olarak çözer ve ikili gövde (xlsx) için `Blob` vermez.
 *
 * BFF ikili/JSON kararını `Content-Type`tan verir ve `status >= 400` HER ZAMAN
 * JSON dalına gider — bu yüzden 403/404/422 gövdeleri burada `BackendError`
 * olarak okunabilir.
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
  const response = await globalThis.fetch(unitsExportPath(projectId), {
    method: "GET",
    credentials: "same-origin",
  });
  if (!response.ok) throw await toBackendError(response);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = exportFilename(
      response.headers.get("content-disposition"),
      DEFAULT_EXPORT_FILENAME,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // `finally`: tarayıcı indirmeyi reddetse bile obje URL'i sızdırılmaz.
    URL.revokeObjectURL(objectUrl);
  }
}
