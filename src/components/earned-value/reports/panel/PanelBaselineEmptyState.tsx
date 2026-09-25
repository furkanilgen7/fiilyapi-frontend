"use client";

import Link from "next/link";

import "./panel-empty-states.css";

export interface PanelBaselineEmptyStateProps {
  /** `links.budget`. */
  budgetHref: string;
}

/**
 * PLN-F3.3 · (a) Baseline yok — Panel:401-409. `has_baseline === false`
 * iken basılır; mockup'ta birebir: kesikli çerçeve, kesik-çizgili onay
 * ikonu, başlık, açıklama, "Adam-Saat Bütçesi'ne git" düğmesi.
 */
export function PanelBaselineEmptyState({ budgetHref }: PanelBaselineEmptyStateProps) {
  return (
    <div className="ev-panel-empty" role="status">
      <svg width="26" height="26" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 13l4-5 3 3 5-7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 2"
        />
      </svg>
      <div className="ev-panel-empty__title">Henüz baseline yok</div>
      <p className="ev-panel-empty__text">Önce Adam-Saat Bütçesi oluşturup baseline&apos;ı dondurun.</p>
      <Link href={budgetHref} className="ev-panel-empty__action">
        Adam-Saat Bütçesi&apos;ne git
      </Link>
    </div>
  );
}
