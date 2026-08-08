import { pendingModuleLabel } from "@/lib/pending-modules";

import "./employer-contract-detail.css";

/**
 * E14 94 · "Belgeler" sekmesi — **PENDING** (ONAYLI KARAR, spec §3).
 *
 * Belge çekirdeği (BC) backend'de CANLI ama **belge arşivi EKRANI F-BC
 * diliminin işidir** ve `EmployerContractDetail.documents` şemada `null`
 * tipindedir. Karar: sekme BASILIR (mockup 94 silinmez), içeriği PENDING
 * kartıdır — bu dilimde arşiv ekranı YAZILMAZ.
 *
 * SIZINTI YOK: prop almaz, ağa çıkmaz (`documents` BFF kökü de bu dilimde
 * AÇILMADI).
 */
export const DOCUMENTS_PENDING_REASON = pendingModuleLabel("documents");

export function ContractDocumentsPendingCard() {
  return (
    <section className="ecd-card" aria-labelledby="ecd-documents-title">
      <h2 className="ecd-card__title" id="ecd-documents-title">
        Belgeler
      </h2>
      <p className="ecd-pending__notice" data-testid="ecd-documents-pending">
        Sözleşme belgeleri henüz bu ekrandan gösterilmiyor — {DOCUMENTS_PENDING_REASON}.
        Belge arşivi ekranı ayrı bir dilimde eklenecek.
      </p>
    </section>
  );
}
