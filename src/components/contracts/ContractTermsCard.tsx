import { PRICE_INDEX_TYPE_LABELS } from "@/lib/contract-labels";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { EmployerContractDetail } from "@/lib/api/hooks/useContract";

import "./employer-contract-detail.css";

/**
 * "Sözleşme Koşulları" — **§7 S3, ONAYLI KARAR** (yeniden tartışılmaz).
 *
 * Bu bölüm E14 mockup'ında ÇİZİLİ DEĞİLDİR. Şemada (`EmployerContractDetail`)
 * var olup mockup'ın hiçbir yerinde gösterilmeyen dört koşul alanı burada
 * SALT-OKUNUR basılır — gerekçe: veri kaybını önlemek. Alanlar icat değildir;
 * dördü de `Form - Proje Oluştur.dc.html`ın "Sözleşme Bilgileri" kartından
 * (satır 117-128) gelir, yani mockup'lar arası tamamlamadır.
 *
 * Kapsam disiplini: blok mockup'ın kendi gövdesine SIZMAZ — iki sütunlu
 * ızgaranın (97) DIŞINDA, altında, kendi başlığıyla ayrı bir bölümdür
 * (`.ecd-terms-section`). Başlık kartındaki 5 metriğe (80-86) ve Hakediş
 * Özeti'ne (126-148) HİÇBİR satır eklenmez.
 *
 * SALT-OKUNUR: form kontrolü YOK (backend'de sözleşme alanları için yazma ucu
 * da yok — şema açıklaması). Alan eşlemesi:
 * - `vat_pct`             → "KDV Oranı"
 * - `late_penalty_daily`  → "Gecikme Cezası (Günlük)" (nullable → "—")
 * - `has_price_escalation`→ "Fiyat Farkı" ("Var" / "Yok")
 * - `index_type`          → "Endeks Tipi" (nullable; fiyat farkı yoksa "—")
 */
export interface ContractTermsCardProps {
  detail: EmployerContractDetail;
}

const DASH = "—";

export function ContractTermsCard({ detail }: ContractTermsCardProps) {
  return (
    <section
      className="ecd-card"
      aria-labelledby="ecd-terms-title"
      data-testid="ecd-terms"
    >
      <h2 className="ecd-card__title" id="ecd-terms-title">
        Sözleşme Koşulları
      </h2>

      <div className="ecd-terms">
        <Term label="KDV Oranı" testId="ecd-term-vat">
          {formatPercent(detail.vat_pct)}
        </Term>
        <Term label="Gecikme Cezası (Günlük)" testId="ecd-term-penalty">
          {detail.late_penalty_daily === null
            ? DASH
            : formatCurrency(detail.late_penalty_daily)}
        </Term>
        <Term label="Fiyat Farkı" testId="ecd-term-escalation">
          {detail.has_price_escalation ? "Var" : "Yok"}
        </Term>
        <Term label="Endeks Tipi" testId="ecd-term-index">
          {detail.index_type === null ? DASH : PRICE_INDEX_TYPE_LABELS[detail.index_type]}
        </Term>
      </div>
    </section>
  );
}

function Term({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="ecd-terms__label">{label}</div>
      {/* Salt-okunur: `div`dir, form kontrolü DEĞİLDİR. */}
      <div className="ecd-terms__value" data-testid={testId}>
        {children}
      </div>
    </div>
  );
}
