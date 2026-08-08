import { DocumentsPlaceholderCard } from "@/components/form-shell";

import { PENDING_DOCUMENTS, PENDING_HR_SCREEN } from "./constants";
import {
  PERSONNEL_DOCUMENTS,
  PERSONNEL_DOCUMENTS_DROP_SUBTITLE,
  PERSONNEL_DOCUMENTS_DROP_TITLE,
  PERSONNEL_DOCUMENTS_NOTE,
  PERSONNEL_DOCUMENTS_TITLE,
  PERSONNEL_DOCUMENTS_WARNING_AFTER_LINK,
  PERSONNEL_DOCUMENTS_WARNING_BEFORE_LINK,
  PERSONNEL_DOCUMENTS_WARNING_LINK,
  PERSONNEL_DOCUMENTS_WARNING_STRONG,
} from "./document-items";

/**
 * 📎 Belgeler (mockup satır 122–201) — altı kutu + genel sürükle-bırak +
 * uyarı kutusu. Izgara İKİ sütundur (124).
 *
 * Yükleme kodu bu dilimde YAZILMAZ; uyarı kutusundaki "Belge Takibi"
 * bağlantısının hedef ekranı da yok, bu yüzden EDİLGEN basılır.
 */
export function PersonnelDocumentsCard() {
  return (
    <DocumentsPlaceholderCard
        title={PERSONNEL_DOCUMENTS_TITLE}
        note={PERSONNEL_DOCUMENTS_NOTE}
        items={PERSONNEL_DOCUMENTS}
        dropTitle={PERSONNEL_DOCUMENTS_DROP_TITLE}
        dropSubtitle={PERSONNEL_DOCUMENTS_DROP_SUBTITLE}
      soonTitle={PENDING_DOCUMENTS}
      columns={2}
      // 195-200 — uyarı kutusu belge kartının İÇİNDEDİR.
      footer={
        <div className="pnf-warning">
          <p className="pnf-warning__text">
            <strong>{PERSONNEL_DOCUMENTS_WARNING_STRONG}</strong>
            {PERSONNEL_DOCUMENTS_WARNING_BEFORE_LINK}
            {/* Edilgen: "Belge Takibi" ekranının rotası henüz yok. */}
            <span className="pnf-warning__link" title={PENDING_HR_SCREEN}>
              {PERSONNEL_DOCUMENTS_WARNING_LINK}
            </span>
            {PERSONNEL_DOCUMENTS_WARNING_AFTER_LINK}
          </p>
        </div>
      }
    />
  );
}
