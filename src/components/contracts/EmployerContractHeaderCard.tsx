import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { cx } from "@/lib/cx";
import { formatCompactCurrency, formatDateDots, formatPercent } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { EmployerContractDetail } from "@/lib/api/hooks/useContract";

import { contractEndTone } from "./contract-end-tone";
import { CONTRACT_STATUS_BADGE } from "./contract-status";
import "./employer-contract-detail.css";

/**
 * E14 65-87 · başlık kartı + 5 metrik.
 *
 * Alan eşlemesi (mockup satırı → şema alanı):
 * - 69  mono sözleşme no          → `contract_no` (nullable → "—")
 * - 70  durum rozeti              → `status` (SZL ile TEK kaynak: `contract-status.ts`)
 * - 72  h1 sözleşme başlığı       → **proje adı**. `EmployerContractDetail`
 *       başlık alanı TAŞIMAZ; SZL listesi de satır başlığını proje adından
 *       kurar (`_employer_item(title=project.name)`), aynı kaynak kullanılır.
 * - 73  "İşveren: … · Yüklenici: …" → `employer_name` / `contractor_name`
 * - 76  "PDF"                     → DEVRE DIŞI (dışa aktarma ucu yok)
 * - 77  "Düzenle"                 → DEVRE DIŞI (aşağıdaki gerekçe)
 * - 81  Sözleşme Bedeli           → `amount` (nullable), 15px/700 mono
 * - 82  İmza Tarihi               → `signature_date`
 * - 83  Başlangıç                 → `start_date`
 * - 84  Bitiş Tarihi              → `end_date`. RENGİ TÜREVDİR, mockup'ın
 *       sabit kırmızısı DEĞİL (F-SZLEKR · onaylı sapma): mockup 84 kırmızı
 *       basar ama tarihi GELECEKTEDİR (31.12.2026), yani o kırmızı anlam
 *       taşımaz. Kural `contract-end-tone.ts`tedir — geçmiş = kırmızı,
 *       0..30 gün = kehribar, ötesi nötr. (`Subcontractor…HeaderCard` aynı
 *       metriği nötr basıyordu; ürün içi çelişki de böyle kapanır.)
 * - 85  Avans                     → `advance_pct` · `advance_amount`
 *
 * Üst kural: backend'i olmayan öğe SİLİNMEZ. İki buton da yerinde durur,
 * `disabled` + `title` + ekranda görünür gerekçe (`EmployerContractDetailView`
 * bandı) ile basılır.
 */
export interface EmployerContractHeaderCardProps {
  detail: EmployerContractDetail;
  /** 72 · proje adı (`useProject`); henüz yüklenmediyse boş bırakılır. */
  projectName?: string;
  /**
   * 84 · "bugün" — ZORUNLUDUR, gizli `new Date()` YOKTUR. Bileşen saati
   * kendisi okusaydı görsel kareler aynı baseline'ı turdan tura başka renkle
   * basar ve kendiliğinden kırılırdı (`contract-end-tone.ts` gerekçesi).
   */
  today: Date;
}

export const PDF_DISABLED_REASON = pendingModuleLabel("pdf_export");
export const EDIT_DISABLED_REASON = pendingModuleLabel("employer_contract_edit");

const DASH = "—";

export function EmployerContractHeaderCard({
  detail,
  projectName,
  today,
}: EmployerContractHeaderCardProps) {
  const badge = CONTRACT_STATUS_BADGE[detail.status];
  // 84 · nötr dalda HİÇ değiştirici sınıf basılmaz (`Metric` `tone`u opsiyonel).
  const endTone = contractEndTone(detail.end_date, today);

  return (
    <section className="ecd-head" aria-labelledby="ecd-title">
      <div className="ecd-head__top">
        <div>
          <div className="ecd-head__meta">
            <span className="ecd-head__no">{detail.contract_no ?? DASH}</span>
            <Badge
              variant={badge.variant}
              className={cx("szl-badge", detail.status === "on_hold" && "szl-badge--on-hold")}
            >
              {badge.label}
            </Badge>
          </div>
          <h1 className="ecd-head__title" id="ecd-title">
            {projectName ?? DASH}
          </h1>
          <div className="ecd-head__parties">
            {`İşveren: ${detail.employer_name ?? DASH} · Yüklenici: ${
              detail.contractor_name ?? DASH
            }`}
          </div>
        </div>

        <div className="ecd-head__actions">
          <Button
            variant="secondary"
            className="ecd-head__btn"
            disabled
            title={PDF_DISABLED_REASON}
            data-testid="ecd-pdf-disabled"
          >
            PDF
          </Button>
          <Button
            variant="primary"
            className="ecd-head__btn"
            disabled
            title={EDIT_DISABLED_REASON}
            data-testid="ecd-edit-disabled"
          >
            Düzenle
          </Button>
        </div>
      </div>

      <div className="ecd-metrics" data-testid="ecd-metrics">
        <Metric label="Sözleşme Bedeli" tone="money">
          {detail.amount === null ? DASH : formatCompactCurrency(detail.amount)}
        </Metric>
        <Metric label="İmza Tarihi">
          {detail.signature_date ? formatDateDots(detail.signature_date) : DASH}
        </Metric>
        <Metric label="Başlangıç">
          {detail.start_date ? formatDateDots(detail.start_date) : DASH}
        </Metric>
        <Metric
          label="Bitiş Tarihi"
          tone={endTone === "neutral" ? undefined : endTone}
          testId="ecd-metric-end-date"
        >
          {detail.end_date ? formatDateDots(detail.end_date) : DASH}
        </Metric>
        <Metric label="Avans">
          {`${formatPercent(detail.advance_pct)} · ${formatCompactCurrency(detail.advance_amount)}`}
        </Metric>
      </div>
    </section>
  );
}

function Metric({
  label,
  tone,
  testId,
  children,
}: {
  label: string;
  /**
   * `"warning"` F-SZLEKR'de EKLENDİ ve CSS'i de aynı turda yazıldı
   * (`.ecd-metrics__value--warning`); ton adı stylesheet'te karşılığı
   * olmadan yaşarsa ekranda GÖRÜNMEYEN bir ton olurdu (sessiz kusur).
   */
  tone?: "money" | "danger" | "warning";
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="ecd-metrics__label">{label}</div>
      <div
        className={cx("ecd-metrics__value", tone && `ecd-metrics__value--${tone}`)}
        data-testid={testId}
      >
        {children}
      </div>
    </div>
  );
}
