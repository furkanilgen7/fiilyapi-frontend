import { downloadExport } from "@/lib/api/download";

// Ekran 13 · Is Kalemleri (BOQ) Excel disa aktarimi (spec §8.2).
// 🔴 EXPORT-XLSX · indirme govdesi artik `@/lib/api/download` TEK kaynagindan
// gelir; bu dosyada yalniz YOL kurucusu ve varsayilan ad yasar.

const DEFAULT_EXPORT_FILENAME = "is-kalemleri.xlsx";

// `siteId` UUID beklenir ama rota parametresi KULLANICI GIRDISIDIR — sablona
// girmeden once kacisi yapilir.
function boqExportPath(siteId: string): string {
  return `/api/backend/sites/${encodeURIComponent(siteId)}/boq/export`;
}

/**
 * Excel dosyasını BFF üzerinden indirir. Uç şemada olsa da bilinçli olarak ham
 * `fetch` kullanılır: openapi-fetch yanıtı içerik tipine göre JSON/metin olarak
 * çözer ve ikili gövde (xlsx) için `Blob` vermez.
 *
 * Token yalnızca httpOnly cookie'de kalır — URL'e imzalı token/parametre
 * KOYULMAZ, istek `credentials: "same-origin"` ile gider.
 */
export async function downloadBoqExport(siteId: string): Promise<void> {
  await downloadExport(boqExportPath(siteId), DEFAULT_EXPORT_FILENAME);
}
