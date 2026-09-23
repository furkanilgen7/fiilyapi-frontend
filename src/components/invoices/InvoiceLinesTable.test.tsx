import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { InvoiceLinesTable } from "./InvoiceLinesTable";
import type { InvoiceDetailResponse } from "@/lib/api/hooks/useInvoiceDetail";

/**
 * no 134/135 — tfoot'un oran ↔ tutar tutarlılığı.
 */

function invoice(overrides: Partial<InvoiceDetailResponse> = {}): InvoiceDetailResponse {
  return {
    advance_amount: "0.00",
    advance_rate: null,
    created_at: "2026-01-01T00:00:00Z",
    created_by_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    customer_id: null,
    direction: "outgoing",
    document_type: "einvoice",
    due_date: null,
    employer_id: null,
    equipment_rental_invoice_id: null,
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    invoice_no: "FAT-2026-001",
    issue_date: "2026-01-01",
    lines: [
      {
        description: "Beton işleri",
        detail_note: null,
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        line_total: "1000.00",
        quantity: "10.000",
        sort_order: 1,
        unit: "m³",
        unit_price: "100.00",
        vat_rate: "20.00",
      },
    ],
    note: null,
    party_address: null,
    party_name: "ABC İnşaat",
    party_tax_number: null,
    party_tax_office: null,
    payment_method: null,
    progress_payment_id: null,
    project_id: null,
    purchase_order_id: null,
    retention_amount: "0.00",
    retention_rate: null,
    site_id: null,
    slug: "FAT-2026-001",
    status: "draft",
    subcontractor_id: null,
    subcontractor_progress_payment_id: null,
    subtotal: "1000.00",
    supplier_id: null,
    tax_base: "1000.00",
    total: "1200.00",
    updated_at: "2026-01-01T00:00:00Z",
    vat_amount: "200.00",
    withholding_amount: "0.00",
    withholding_rate: null,
    ...overrides,
  } as InvoiceDetailResponse;
}

describe("InvoiceLinesTable — avans/teminat/tevkifat oran ↔ tutar tutarlılığı (no 134/135)", () => {
  it("no 134 · advance_rate NULL ama advance_amount DOLUYKEN '(%0)' YALAN basılmaz", () => {
    render(
      <InvoiceLinesTable invoice={invoice({ advance_amount: "200.00", advance_rate: null })} />,
    );
    const row = screen.getByText(/Avans Kesintisi/).closest("tr");
    expect(row).not.toHaveTextContent("(%0)");
  });

  it("advance_rate GERÇEKTEN 0 iken '(%0)' doğru basılır (pozitif kontrol)", () => {
    render(
      <InvoiceLinesTable invoice={invoice({ advance_amount: "200.00", advance_rate: "0.00" })} />,
    );
    const row = screen.getByText(/Avans Kesintisi/).closest("tr");
    expect(row).toHaveTextContent("(%0)");
  });
});
