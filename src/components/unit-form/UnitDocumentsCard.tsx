import { DocumentsPlaceholderCard } from "@/components/form-shell";

import {
  UNIT_DOCUMENTS,
  UNIT_DOCUMENTS_PENDING_REASON,
  UNIT_DOCUMENTS_TITLE,
} from "./constants";

/**
 * "📎 Ünite Belgeleri" kartı (UE 103-122).
 *
 * 🔴 PENDING — İKİ AYRI GEREKÇE, İKİSİ DE BUGÜN GEÇERLİ:
 *   1. `documents` tablosunda `unit_id` YOKTUR (yalnız `project_id`/`site_id`),
 *      yani bir belge üniteye BAĞLANAMAZ.
 *   2. Oluşturma kipinde ünite kimliği HENÜZ YOKTUR — kayıt yazılmadan önce
 *      yüklenen dosyanın bağlanacağı bir kayıt yok.
 * Bu yüzden gerçek yükleme render EDİLMEZ (`<input type=file>` yok, sürükleme
 * işleyicisi yok); üç kutu `aria-disabled` + "Yakında" rozetli basılır ve
 * gerekçe kart başlığında GÖRÜNÜR durur (`SaleDocumentsCard` emsali).
 *
 * Mockup üç sütunlu ızgara çizer (105) ve alt sürükle-bırak satırı YOKTUR;
 * `dropTitle`/`dropSubtitle` geçilmez.
 */
export function UnitDocumentsCard() {
  return (
    <DocumentsPlaceholderCard
      title={`📎 ${UNIT_DOCUMENTS_TITLE}`}
      note={UNIT_DOCUMENTS_PENDING_REASON}
      items={UNIT_DOCUMENTS}
      soonTitle={UNIT_DOCUMENTS_PENDING_REASON}
      columns={3}
    />
  );
}
