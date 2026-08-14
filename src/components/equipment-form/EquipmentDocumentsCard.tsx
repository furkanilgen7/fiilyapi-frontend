import { DocumentsPlaceholderCard } from "@/components/form-shell";

import {
  DOCUMENTS_CARD_NOTE,
  DOCUMENTS_CARD_TITLE,
  DOCUMENTS_PENDING_REASON,
  EQUIPMENT_DOCUMENTS,
} from "./constants";

/**
 * 📎 Ekipman Belgeleri (mockup satır 128-162) — altı kutu, İKİ sütun (130).
 *
 * Yükleme kodu bu dilimde YAZILMAZ ve bu bir eksiklik DEĞİL, MK-1 §9.2'nin
 * BİLİNÇLİ kararıdır: mockup "Periyodik Muayene · Yıllık zorunlu" için
 * GEÇERLİLİK TARİHİ alanı çizmiyor; tarihsiz saklanan belge, süresi dolmuş
 * muayeneyi "var" gösterirdi. Kutular SİLİNMEZ (F-TH kalıcı kuralı),
 * devre-dışı basılır ve gerekçe GÖRÜNÜR durur.
 */
export function EquipmentDocumentsCard() {
  return (
    <DocumentsPlaceholderCard
      title={DOCUMENTS_CARD_TITLE}
      note={DOCUMENTS_CARD_NOTE}
      items={EQUIPMENT_DOCUMENTS}
      soonTitle={DOCUMENTS_PENDING_REASON}
      columns={2}
      footer={
        <p className="eqf-picker-note" data-testid="makine-belge-gerekce">
          {DOCUMENTS_PENDING_REASON}
        </p>
      }
    />
  );
}
