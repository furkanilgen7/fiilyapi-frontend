import Link from "next/link";

import { invoiceSource, REASONS, type InvoiceSourceFields } from "./invoice-labels";

/**
 * FY:113 "Hakediş #5 →" · FY:167 "Hakediş #47 →" · FY:185 "SP-2026-042 →"
 * çipinin gerçek karşılığı.
 *
 * 🔴 SIRA NUMARASI (`#5`) SUNUCUDAN GELMEZ — `InvoiceResponse` yalnız kaynağın
 * KİMLİĞİNİ taşır. Numara uydurulmaz; çip kaynağın TÜRÜNÜ yazar, eksiklik
 * tablonun altındaki bantta ADIYLA söylenir (`REASONS.sourceNumber`).
 *
 * Rotası olan kaynak GERÇEK bağlantıdır; olmayan solgun çiptir ve gerekçesini
 * `title` + `sr-only` ile taşır (F-TH kanonu).
 */
export function InvoiceSourceChip({
  fields,
  testId,
}: {
  fields: InvoiceSourceFields;
  testId?: string;
}) {
  const source = invoiceSource(fields);
  if (source === null) {
    return (
      <span
        className="fat-table__muted"
        data-testid={testId}
        title="Bu fatura bir hakediş/sipariş kaynağına bağlı değil."
      >
        Bağımsız fatura
      </span>
    );
  }

  if (source.href !== null) {
    return (
      <Link className="fat-chip" href={source.href} data-testid={testId}>
        {source.label} <span aria-hidden="true">&rarr;</span>
        <span className="sr-only"> — {REASONS.sourceNumber}</span>
      </Link>
    );
  }

  return (
    <span className="fat-chip fat-chip--muted" title={source.reason ?? ""} data-testid={testId}>
      {source.label}
      <span className="sr-only"> — {source.reason}</span>
    </span>
  );
}
