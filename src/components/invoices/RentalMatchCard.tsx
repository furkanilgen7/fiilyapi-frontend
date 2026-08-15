import { Badge, Button } from "@/components/ui";
import { formatDecimal } from "@/lib/format";
import type {
  RentalInvoiceDetailResponse,
  VarianceStatus,
} from "@/lib/api/hooks/useInvoiceDetail";

import { REASONS } from "./invoice-labels";

const VARIANCE_LABELS: Record<VarianceStatus, string> = {
  match: "Eşleşiyor", // FGE:121
  over: "Fark Var", // FGE:128
  under: "Eksik Faturalanmış",
  unknown: "Karşılaştırılamadı",
};

const VARIANCE_VARIANTS: Record<VarianceStatus, "success" | "warning" | "neutral"> = {
  match: "success",
  over: "warning",
  under: "warning",
  unknown: "neutral",
};

/**
 * FGE:104-143 "Otomatik Eşleştirme Kontrolü".
 *
 * 🔴 Mockup İKİ backend kaynağını tek sayfada karıştırır: bu tablo generik
 * `/invoices/{id}`den GELMEZ, MK-2'nin makine kira faturasından gelir
 * (`/equipment/rental-invoices/{id}`). Bu yüzden kart YALNIZ
 * `equipment_rental_invoice_id` DOLUYKEN basılır — boş olduğunda kart hiç
 * çizilmez (devre-dışı bant da değil: o veri o fatura için ANLAMSIZDIR).
 *
 * "Bizim Kayıt" = `worked_hours`, "Fatura" = `invoiced_hours`, "Fark" =
 * `hours_variance`, "Durum" = `variance_status` — dördü de sunucudan gelir,
 * ekranda çıkarma YAPILMAZ.
 */
export function RentalMatchCard({
  rental,
  isLoading,
  errorMessage,
}: {
  rental: RentalInvoiceDetailResponse | undefined;
  isLoading: boolean;
  errorMessage: string | undefined;
}) {
  if (isLoading) return <p className="fat-notice">Eşleştirme kontrolü yükleniyor…</p>;
  if (errorMessage !== undefined) {
    return (
      <p className="fat-notice fat-notice--danger" data-testid="fat-match-error">
        {errorMessage}
      </p>
    );
  }
  if (rental === undefined) return null;

  const overCount = rental.lines.filter((line) => line.variance_status === "over").length;

  return (
    <section className="fat-panel fat-match" aria-label="Otomatik Eşleştirme Kontrolü">
      <div className="fat-panel__head">
        <span className="fat-panel__title">Otomatik Eşleştirme Kontrolü</span>
      </div>
      <div className="fat-panel__body">
        {/* FGE:54-61 uyarı bandı — sayı SUNUCUDAN sayılır, metin uydurulmaz. */}
        {overCount > 0 && (
          <p className="fat-notice fat-notice--danger" data-testid="fat-match-warning">
            {overCount} ekipmanda fatura saati bizim kaydımızdan FAZLA.
          </p>
        )}
        <div className="fat-table-scroll">
          <table className="fat-table" data-testid="fat-match-table">
            <thead>
              <tr>
                <th scope="col">Ekipman</th>
                <th scope="col" className="is-right">
                  Bizim Kayıt
                </th>
                <th scope="col" className="is-right">
                  Fatura
                </th>
                <th scope="col" className="is-right">
                  Fark
                </th>
                <th scope="col" className="is-center">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody>
              {rental.lines.map((line) => (
                <tr key={line.id} data-testid="fat-match-row" data-variance={line.variance_status}>
                  <td>
                    <div className="fat-table__party">{line.equipment_name}</div>
                    <div className="fat-table__muted">{line.site_name ?? "Şantiye belirtilmemiş"}</div>
                  </td>
                  <td className="is-right is-mono">
                    {formatDecimal(line.worked_hours, 2)} saat
                  </td>
                  <td className="is-right is-mono">
                    {line.invoiced_hours === null
                      ? "—"
                      : `${formatDecimal(line.invoiced_hours, 2)} saat`}
                  </td>
                  <td
                    className={`is-right is-mono${
                      line.variance_status === "over" ? " fat-variance--over" : ""
                    }`}
                  >
                    {line.hours_variance === null
                      ? "—"
                      : `${formatDecimal(line.hours_variance, 2)} saat`}
                  </td>
                  <td className="is-center">
                    <Badge variant={VARIANCE_VARIANTS[line.variance_status]}>
                      {VARIANCE_LABELS[line.variance_status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* FGE:138-142 — üç düğmeden ikisinin karşılığı YOK, silinmez. */}
        <div className="fat-match__actions">
          <Button disabled title={REASONS.partialApprove} data-testid="fat-partial-approve">
            Kısmi Onayla<span className="sr-only"> — {REASONS.partialApprove}</span>
          </Button>
          <Button disabled title={REASONS.contact} data-testid="fat-contact-supplier">
            Firmayla İletişim<span className="sr-only"> — {REASONS.contact}</span>
          </Button>
        </div>
        <p className="fat-notice" data-testid="fat-match-reason">
          {REASONS.partialApprove} {REASONS.contact}
        </p>
      </div>
    </section>
  );
}
