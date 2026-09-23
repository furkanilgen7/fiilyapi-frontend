import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HrExpiringDocumentsTable } from "./HrExpiringDocumentsTable";
import type { HrExpiringDocument } from "@/lib/api/hooks/useHrDocuments";

const ROW: HrExpiringDocument = {
  id: "d-1",
  personnel_id: "p-1",
  personnel_name: "Ali Veli",
  document_label: "SGK",
  valid_until: "2026-01-01",
  days_remaining: 10,
} as unknown as HrExpiringDocument;

describe("HrExpiringDocumentsTable — sunucu tarafı kırpılma (SUMMARY_LIST_LIMIT=50)", () => {
  it("🔴 totalCount satır sayısından BÜYÜKSE liste eksik uyarısı gösterilir", () => {
    render(<HrExpiringDocumentsTable rows={[ROW]} isLoading={false} totalCount={120} />);

    expect(screen.getByText(/liste eksik/)).toBeInTheDocument();
  });
});
