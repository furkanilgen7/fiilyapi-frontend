import { downloadExport, withQuery } from "@/lib/api/download";
import type { PersonnelListFilter } from "@/lib/api/hooks/usePersonnel";

/**
 * EXPORT-XLSX · `GET /personnel/export.xlsx` — Personel listesinin Excel çıktısı.
 *
 * 🔴 DIŞA AKTARIM EKRANIN GÖRDÜĞÜ KÜMEDİR: fonksiyon, listeyi besleyen
 * `PersonnelListFilter` nesnesinin AYNISINI alır. Süzgeç tipi burada yeniden
 * TANIMLANMAZ; hook'un tipinden gelir, böylece bir süzgeç eklendiğinde bu
 * dosya sessizce geride kalamaz.
 *
 * 🔴 `limit`/`offset` GEÇMEZ — sayfalama bir SÜZGEÇ DEĞİLDİR. Personel ekranı
 * kadroyu tavanla (200) tek istekte çeker ve sayfalamayı İSTEMCİDE yapar
 * (`paginateClientSide`); "1–6 gösteriliyor" bir görünüm penceresidir, bir
 * kapsam daraltması değil. Excel'i o pencereye kısmak kullanıcının kadrosunun
 * altı satırını verirdi.
 *
 * 🔴🔴 ÖLÇÜLMÜŞ BOŞLUK — MESLEK (`trade`) SÜZGECİ SUNUCUDA YOKTUR
 * (`PersonnelListView`: *"`trade` (meslek) süzgeci backend'de YOKTUR (spec
 * K-B)"*; süzme `personnel-derive.ts::filterByTrade` ile İSTEMCİDE yapılır).
 * Bu uç da onu almaz. Yani meslek süzgeci AÇIKKEN indirilen dosya ekranda
 * görülenden GENİŞ olurdu ⇒ ekran o hâlde düğmeyi devre dışı bırakır ve
 * gerekçeyi GÖRÜNÜR basar. Burada uydurma bir `trade` parametresi
 * GÖNDERİLMEZ: sunucu onu tanımaz ve istek 422 olurdu.
 *
 * ⚠️ BFF İZİN LİSTESİ: ilk path segmenti `personnel` ve o kök `ALLOWED_ROOTS`ta
 * ZATEN vardır (ölçüldü). Yeni kök EKLENMEZ.
 */

const PERSONNEL_EXPORT_PATH = "/api/backend/personnel/export.xlsx";
const DEFAULT_EXPORT_FILENAME = "personel.xlsx";

/** Ekran süzgeçlerinin sunucu adlarına çevrimi — saf, testin ölçebilmesi için. */
export function personnelExportSearchParams(
  filter: PersonnelListFilter,
): Record<string, string> {
  return {
    ...(filter.q ? { q: filter.q } : {}),
    ...(filter.source !== undefined ? { source: filter.source } : {}),
    ...(filter.subcontractorId !== undefined
      ? { subcontractor_id: filter.subcontractorId }
      : {}),
    ...(filter.isActive !== undefined ? { is_active: String(filter.isActive) } : {}),
    ...(filter.projectId !== undefined ? { project_id: filter.projectId } : {}),
  };
}

export async function downloadPersonnelExport(filter: PersonnelListFilter): Promise<void> {
  await downloadExport(
    withQuery(PERSONNEL_EXPORT_PATH, personnelExportSearchParams(filter)),
    DEFAULT_EXPORT_FILENAME,
  );
}
