import { pendingModuleLabel } from "@/lib/pending-modules";

import "./employer-contract-detail.css";

/**
 * E14 99-123 · "Milestone Takvimi" kartı — **PENDING**.
 *
 * `EmployerContractDetail.milestones` şemada AÇIKÇA `null` tipindedir
 * ("Kapsam dışı: milestone takvimi (P11)"); proje takvimini veren bir uç bu
 * repoda YOK. Üst kural gereği bölüm SİLİNMEZ — başlığıyla (100), yerinde,
 * devre dışı ve görünür gerekçeyle basılır (`PlanMaterialsCard` emsali).
 *
 * UYDURMA VERİ YOK: mockup'ın beş sahte milestone'u ("Temel ve Bodrum Katlar"
 * … "Teslimat & Kesin Kabul", 104-120) ve durum metinleri BASILMAZ — gerçek
 * takvim gibi görünen tarihler sahada yanlış karar verdirirdi. Yerlerinde
 * yalnız `aria-hidden` bir iskelet durur.
 *
 * SIZINTI YOK: bileşen prop ALMAZ, state TUTMAZ, ağa ÇIKMAZ.
 */
export const MILESTONES_PENDING_REASON = pendingModuleLabel("contract_milestones");

/** 101-121: mockup'taki milestone satırı sayısı. */
const SKELETON_ROWS = 5;

export function ContractMilestonesPendingCard() {
  return (
    <section className="ecd-card" aria-labelledby="ecd-milestones-title">
      {/* 100 */}
      <h2 className="ecd-card__title" id="ecd-milestones-title">
        Milestone Takvimi
      </h2>

      <p className="ecd-pending__notice" data-testid="ecd-milestones-pending">
        Sözleşme milestone takvimi henüz açılmadı — {MILESTONES_PENDING_REASON}.
      </p>

      <div className="ecd-pending__skeleton" aria-hidden="true">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div className="ecd-pending__skeleton-row" key={index}>
            <span className="ecd-pending__skeleton-dot" />
            <span className="ecd-pending__skeleton-line" />
          </div>
        ))}
      </div>
    </section>
  );
}
