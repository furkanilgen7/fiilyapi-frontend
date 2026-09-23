import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SalesTable } from "./SalesTable";
import { UpcomingCollectionsCard } from "./UpcomingCollectionsCard";
import { EMPTY_CELL } from "@/lib/format";
import type { SaleRow } from "./sales-labels";
import type { UpcomingCollection } from "@/lib/api/hooks/useSalesSummary";

/**
 * KAPSAM MASKESİ — satış ekranının para alanları (`Gorunurluk.para`).
 *
 * 🔴 `limited` kapsamı `sales` matrisinde BUGÜN kullanılmıyor (satırın tek
 * kapsamı `accounting = finance`), yani bu iki kusur LATENTtir. Yine de
 * kapatılır: kapsam bir izin satırının değiştirilmesiyle açılır ve o an kusur
 * kod incelemesi olmadan CANLIYA çıkar. Biçimlendiriciler tutarı zaten "—"
 * basıyor; yanlış olan tutarın YANINDAKİ İDDİAdır.
 */

function row(overrides: Partial<SaleRow> = {}): SaleRow {
  return {
    id: "sl-1",
    status: "deed_transferred",
    unit_label: "A · Daire 12",
    customer_name: "Mehmet Aydın",
    customer_national_id: "12345678901",
    customer_tax_number: null,
    sale_price: "1120000.00",
    paid_amount: "1120000.00",
    remaining_amount: "0.00",
    payment_plan_type: "cash",
    installment_total: 0,
    installment_paid_count: 0,
    overdue_installment_count: 0,
    reservation_deposit: null,
    reservation_due_date: null,
    ...overrides,
  } as SaleRow;
}

function renderTable(overrides: Partial<SaleRow>) {
  return render(
    <SalesTable
      rows={[row(overrides)]}
      serverTotals={undefined}
      statusFilter={undefined}
      onStatusFilterChange={vi.fn()}
      isLoading={false}
      isError={false}
    />,
  );
}

describe("SalesTable 'Kalan' hücresi — maskeli tutar KAPANMIŞ boyanmaz", () => {
  it("🔴 maskeli (null) kalan: 'sıfır' tonu (soluk) UYGULANMAZ", () => {
    const { container } = renderTable({ remaining_amount: null });
    expect(container.querySelector(".satis-table__remaining--zero")).toBeNull();
  });

  it("🔴 POZİTİF KONTROL — gerçek 0 HÂLÂ soluk 'sıfır' tonuyla boyanır", () => {
    const { container } = renderTable({ remaining_amount: "0.00" });
    expect(container.querySelector(".satis-table__remaining--zero")).not.toBeNull();
  });
});

function collection(overrides: Partial<UpcomingCollection> = {}): UpcomingCollection {
  return {
    installment_id: "i-1",
    unit_label: "A Blok · 3",
    customer_name: "Ayşe Yılmaz",
    label: "3. Taksit",
    due_date: "2026-09-20",
    remaining_amount: "120000.00",
    is_overdue: true,
    days_overdue: 12,
    late_fee_amount: "1500.00",
    ...overrides,
  } as unknown as UpcomingCollection;
}

describe("UpcomingCollectionsCard gecikme faizi — maskeli tutar 'faiz yok' demez", () => {
  const feeId = "satis-gecikme-faizi-i-1";

  it("🔴 maskeli (null) faiz: satır GİZLENMEZ, '—' ile basılır", () => {
    render(
      <UpcomingCollectionsCard
        items={[collection({ late_fee_amount: null })]}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.getByTestId(feeId)).toHaveTextContent(EMPTY_CELL);
  });

  it("🔴 POZİTİF KONTROL — gerçek faiz tutarı basılır", () => {
    render(
      <UpcomingCollectionsCard
        items={[collection({ late_fee_amount: "1500.00" })]}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.getByTestId(feeId)).toHaveTextContent("1.500");
  });

  it("🔴 POZİTİF KONTROL — gerçek 0 faizde satır HİÇ basılmaz (mockup kuralı)", () => {
    render(
      <UpcomingCollectionsCard
        items={[collection({ late_fee_amount: "0.00" })]}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.queryByTestId(feeId)).toBeNull();
  });
});
