import { DOCUMENTS_PENDING_REASON } from "./personnel-detail-labels";

/**
 * PD 130-141 · "Belgeler" kartı — BC-2 form-slot bekliyor (spec §1).
 *
 * Mockup dört ÖRNEK belge satırı çizer (sabit tarih/uzantı) ama bu sözde
 * kayıtlar UYDURMA VERİ olur — bu üst kuralı ihlal eder (görev emri). Bu
 * yüzden satırlar BASILMAZ; yalnız "+ Ekle" ve "İndir" AFFORDANCE'ları
 * (mockup'ın kalıcı öğeleri) devre-dışı basılır, gerekçe GÖRÜNÜRDÜR.
 */
export function PersonnelDocumentsSummaryCard() {
  return (
    <section className="pd-card" data-testid="personnel-documents-card">
      <div className="pd-card__head">
        <h2 className="pd-card__title">Belgeler</h2>
        <button
          type="button"
          className="pd-card__add-btn"
          disabled
          title={DOCUMENTS_PENDING_REASON}
        >
          + Ekle
        </button>
      </div>
      <div className="pd-card__pending" aria-disabled="true">
        <p className="pd-card__pending-text">{DOCUMENTS_PENDING_REASON}</p>
        <button
          type="button"
          className="pd-card__download-btn"
          disabled
          title={DOCUMENTS_PENDING_REASON}
        >
          İndir
        </button>
      </div>
    </section>
  );
}
