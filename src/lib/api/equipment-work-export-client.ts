import { downloadExport, withQuery } from "@/lib/api/download";
import type { EquipmentWorkSummaryFilter } from "@/lib/api/hooks/useEquipmentWorkSummary";

/**
 * EXPORT-XLSX · `GET /equipment/work-summary/export.xlsx` — M3 (Çalışma Kaydı)
 * aylık özetinin Excel çıktısı.
 *
 * 🔴 DIŞA AKTARIM EKRANIN GÖRDÜĞÜ KÜMEDİR: fonksiyon, tabloyu/tfoot'u/grafiği
 * besleyen `EquipmentWorkSummaryFilter` nesnesinin AYNISINI alır — dönem ve
 * şantiye ikisi de URL'den okunur (`?year=&month=&site=`).
 *
 * 🔴 `year`+`month` ZORUNLUdur (sunucu özeti yalnız aylıktır); eksikse gerçek
 * backend 422 verir. Ekranda dönem HER ZAMAN çözülmüş olduğu için çağrı
 * onlarsız kurulamaz — tip de buna izin vermez.
 *
 * ⚠️ Ekipman süzgeci EKRANDA DEVRE DIŞIDIR (özet ucu almıyor) — bu yüzden
 * dosyada da yoktur; ekran ile dosya AYNI kapsamdadır.
 *
 * ⚠️ BFF İZİN LİSTESİ: ilk path segmenti `equipment` ve o kök `ALLOWED_ROOTS`ta
 * ZATEN vardır (ölçüldü). Yeni kök EKLENMEZ.
 */

const WORK_SUMMARY_EXPORT_PATH = "/api/backend/equipment/work-summary/export.xlsx";
const DEFAULT_EXPORT_FILENAME = "calisma-kaydi.xlsx";

/** Ekran süzgeçlerinin sunucu adlarına çevrimi — saf, testin ölçebilmesi için. */
export function equipmentWorkExportSearchParams(
  filter: EquipmentWorkSummaryFilter,
): Record<string, string> {
  return {
    year: String(filter.year),
    month: String(filter.month),
    ...(filter.siteId ? { site_id: filter.siteId } : {}),
  };
}

export async function downloadEquipmentWorkExport(
  filter: EquipmentWorkSummaryFilter,
): Promise<void> {
  await downloadExport(
    withQuery(WORK_SUMMARY_EXPORT_PATH, equipmentWorkExportSearchParams(filter)),
    DEFAULT_EXPORT_FILENAME,
  );
}
