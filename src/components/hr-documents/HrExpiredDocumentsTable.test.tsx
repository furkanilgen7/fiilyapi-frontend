import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HrExpiredDocumentsTable } from "./HrExpiredDocumentsTable";
import type { HrExpiredDocument } from "@/lib/api/hooks/useHrDocuments";

const ROW: HrExpiredDocument = {
  id: "d-1",
  personnel_id: "p-1",
  personnel_name: "Ali Veli",
  document_label: "SGK",
  project_name: "Proje A",
  valid_until: "2026-01-01",
  days_overdue: 10,
} as unknown as HrExpiredDocument;

describe("HrExpiredDocumentsTable — sunucu tarafı kırpılma (SUMMARY_LIST_LIMIT=50)", () => {
  it("🔴 totalCount satır sayısından BÜYÜKSE liste eksik uyarısı gösterilir", () => {
    render(
      <HrExpiredDocumentsTable
        rows={[ROW]}
        isLoading={false}
        totalCount={120}
      />,
    );

    expect(screen.getByText(/liste eksik/)).toBeInTheDocument();
  });

  it("totalCount satır sayısına eşitse uyarı basılmaz", () => {
    render(<HrExpiredDocumentsTable rows={[ROW]} isLoading={false} totalCount={1} />);

    expect(screen.queryByText(/liste eksik/)).not.toBeInTheDocument();
  });
});
