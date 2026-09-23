import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PayrollLineResponse } from "@/lib/api/hooks/usePayroll";
import { useUpdatePayrollLineSplit } from "@/lib/api/hooks/usePayrollMutations";

import { PayrollLineRow } from "./PayrollLineRow";

vi.mock("@/lib/api/hooks/usePayrollMutations", () => ({
  useUpdatePayrollLineSplit: vi.fn(),
}));

function line(overrides: Partial<PayrollLineResponse> = {}): PayrollLineResponse {
  return {
    id: "line-1",
    personnel_id: "p-1",
    personnel_name: "Ayşe Demir",
    personnel_source: "company",
    days: "21",
    gross_amount: "37800.00",
    deduction_amount: "11262.00",
    net_amount: "26538.00",
    bank_amount: "26538.00",
    cash_amount: "0.00",
    status: "pending",
    excluded_reason: null,
    is_overridden: false,
    overridden_at: null,
    previous_gross_amount: null,
    tax_base_amount: null,
    cumulative_tax_base: null,
    income_tax_amount: null,
    ...overrides,
  };
}

function mockMutation() {
  vi.mocked(useUpdatePayrollLineSplit).mockReturnValue({
    mutateAsync: vi.fn(async () => undefined),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdatePayrollLineSplit>);
}

function renderRow(payrollLine: PayrollLineResponse, canWrite = true) {
  return render(
    <table>
      <tbody>
        <PayrollLineRow line={payrollLine} canWrite={canWrite} />
      </tbody>
    </table>,
  );
}

/**
 * 🔴 triyaj #150 — `useState(() => amountFieldValue(line.bank_amount))`
 * yalnız ilk mount'ta kurulur; satır `key={line.id}` ile hiç remount
 * olmadığından PATCH sonrası invalidation ile gelen yeni `bank_amount`/
 * `cash_amount` kutulara YANSIMIYORDU.
 */
describe("PayrollLineRow · sunucu değeri senkronu", () => {
  it("ilk render'da banka/elden sunucu değerini basar", () => {
    mockMutation();
    renderRow(line());
    expect(screen.getByTestId("bordro-line-line-1-bank")).toHaveValue("26538.00");
    expect(screen.getByTestId("bordro-line-line-1-cash")).toHaveValue("0.00");
  });

  it("🔴 satır remount olmadan sunucu tutarı değişince kutular GÜNCELLENİR (bayat kalmaz)", () => {
    mockMutation();
    const { rerender } = render(
      <table>
        <tbody>
          <PayrollLineRow line={line()} canWrite={true} />
        </tbody>
      </table>,
    );
    expect(screen.getByTestId("bordro-line-line-1-bank")).toHaveValue("26538.00");

    // Aynı `line.id` ile YENİ bir tutar — invalidation sonrası refetch benzeri.
    rerender(
      <table>
        <tbody>
          <PayrollLineRow
            line={line({ bank_amount: "20000.00", cash_amount: "6538.00" })}
            canWrite={true}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId("bordro-line-line-1-bank")).toHaveValue("20000.00");
    expect(screen.getByTestId("bordro-line-line-1-cash")).toHaveValue("6538.00");
  });
});
