import { Fragment } from "react";

import { cx } from "@/lib/cx";

import {
  APPROVAL_FLOW_ROLES,
  APPROVAL_FLOW_TITLE,
  APPROVAL_PATRON_BASE_DESCRIPTION,
  approvalBelowThresholdLabel,
  approvalPatronDescription,
} from "./approval-labels";

export interface ApprovalFlowStripProps {
  /** `GET /approvals/settings.approval_threshold_try`; yüklenmediyse `undefined`. */
  threshold: string | undefined;
}

/**
 * Mockup `Onay Kutusu.dc.html:42-68` — "Rol Bazlı Onay Akışı" açıklama şeridi.
 * Metinler SABİTTİR: `CHAIN_DEFINITIONS` backend KODUNDADIR ve hiçbir uçtan
 * yayınlanmaz, dolayısıyla dört kartın içeriği mockup'tan alınır.
 *
 * 🔴 EŞİK (`:62` `:65`) SABİT YAZILMAZ — `GET /approvals/settings`ten gelir.
 * Ayar yüklenmediyse eşik parçası DÜŞER ve sağdaki pill HİÇ BASILMAZ; sahte
 * bir sayı basmaktansa cümleyi hiç kurmamak tercih edilir.
 */
export function ApprovalFlowStrip({ threshold }: ApprovalFlowStripProps) {
  const belowThresholdLabel = approvalBelowThresholdLabel(threshold);

  return (
    <section className="ok-flow" aria-label={APPROVAL_FLOW_TITLE} data-testid="ok-flow">
      <p className="ok-flow__title">{APPROVAL_FLOW_TITLE}</p>
      <div className="ok-flow__row">
        {APPROVAL_FLOW_ROLES.map((role, index) => {
          const description =
            role.description === APPROVAL_PATRON_BASE_DESCRIPTION
              ? approvalPatronDescription(threshold)
              : role.description;
          return (
            <Fragment key={role.title}>
              {index > 0 && <FlowArrow />}
              <div
                className={cx("ok-flow__role", role.isHighlighted && "ok-flow__role--patron")}
                data-testid="ok-flow-role"
              >
                {/* :46 :51 :56 :61 · emoji (👷 🏗 📒 👔) fontta KAPSANMIYOR →
                    `ui/icons` SVG karşılıkları. Renk `currentColor`dan gelir;
                    patron kartında beyaza döner (modifier kuralı). */}
                <role.Icon width={14} height={14} className="ok-flow__role-icon" />
                <span>
                  <span className="ok-flow__role-name">{role.title}</span>
                  <span className="ok-flow__role-desc">{description}</span>
                </span>
              </div>
            </Fragment>
          );
        })}
        {belowThresholdLabel !== null && (
          <span className="ok-flow__pill" data-testid="ok-flow-pill">
            {belowThresholdLabel}
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * `:48` mockup'ın KENDİ inline SVG'si (`M5 10h10M11 6l4 4-4 4`). `→` (U+2192)
 * `fonts.css`te KAPSANMIYOR, bu yüzden glif yerine çizim basılır. `ui/icons`e
 * yeni bir ikon EKLENMEZ (paylaşılan yüzey donduruldu) — dilim-yerel bileşen;
 * emsal: `ui/` dışında inline `<svg>` kullanan 15 dosya (ör. `site-diary/
 * DiaryLinesCard.tsx`).
 */
function FlowArrow() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="ok-flow__arrow"
    >
      <path
        d="M5 10h10M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
