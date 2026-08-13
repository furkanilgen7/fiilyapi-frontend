import { DocumentsPlaceholderCard } from "@/components/form-shell";

import { SALE_DOCUMENTS, SALE_DOCUMENTS_PENDING_REASON, SALE_DOCUMENTS_TITLE } from "./constants";

/**
 * "Satış Belgeleri" kartı (DS 167-201).
 *
 * BC (Belge Yönetimi) form-slot bağına PENDING: gerçek yükleme YOK
 * (`<input type=file>` render edilmez, sürükleme yazılmaz), altı kutu
 * `aria-disabled` + "Yakında" rozetli, gerekçe hem `title`da hem kart
 * başlığında GÖRÜNÜR. Gövdeye hiçbir belge anahtarı eklenmez.
 *
 * Mockup üç sütunlu ızgara çizer (170) ve alt sürükle-bırak satırı YOKTUR;
 * `dropTitle`/`dropSubtitle` geçilmez.
 */
export function SaleDocumentsCard() {
  return (
    <DocumentsPlaceholderCard
      title={SALE_DOCUMENTS_TITLE}
      note={SALE_DOCUMENTS_PENDING_REASON}
      items={SALE_DOCUMENTS}
      soonTitle={SALE_DOCUMENTS_PENDING_REASON}
      columns={3}
    />
  );
}
