import { pendingModuleLabel } from "@/lib/pending-modules";
import "./subcontractor-progress-payment-detail.css";

const ROWS: { key: "financial" | "physical" | "duration"; label: string }[] = [
  { key: "financial", label: "Finansal" },
  { key: "physical", label: "Fiziksel" },
  { key: "duration", label: "Süre" },
];

/**
 * F-TH T4 · "Sözleşme İlerlemesi" kartı — Ekran 15'in `PaymentProgressCard`'ı
 * PAYLAŞILAMAZ (brief §Sağ sütun): o bileşen `financial_pct`/`physical_pct`/
 * `duration_pct` null olan SATIRI hiç basmaz, üçü de null ise KARTI HİÇ
 * BASMAZ. Taşeron tarafında bu üç yüzdenin şemada (`SubcontractorContract
 * Detail.progress_payment_summary`) karşılığı YOK — alan bugün her zaman
 * `null` döner (openapi açıklaması) — ama brief AÇIKÇA "kartı bas, üç
 * çubuğu zarif düşüşle göster" diyor (İşveren'in "veri yoksa satırı/kartı
 * gizle" kuralının TERSİ, bilinçli sapma). Bu yüzden ayrı bir bileşen: üç
 * satır HER ZAMAN görünür, HER ZAMAN pending ("—" + title + sr-only),
 * gerçek bir yüzde asla uydurulmaz.
 */
export function SubcontractorContractProgressCard() {
  return (
    <section className="pp-progress-card">
      <h2 className="pp-progress-card__title">Sözleşme İlerlemesi</h2>
      {ROWS.map((row) => (
        <div key={row.key} className="pp-progress-row">
          <div className="pp-progress-row__head">
            <span className="pp-progress-row__label">{row.label}</span>
            <span
              className="thd-progress__pct--pending"
              title={pendingModuleLabel("contract_progress")}
            >
              —<span className="sr-only">{pendingModuleLabel("contract_progress")}</span>
            </span>
          </div>
          <div className="pp-progress-track">
            <div className="thd-progress__track-fill--pending" />
          </div>
        </div>
      ))}
    </section>
  );
}
