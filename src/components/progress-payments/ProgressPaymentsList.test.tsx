import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressPaymentsListBody } from "./ProgressPaymentsList";
import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";

// Final inceleme #5: `showProjectName` prop'u — `/hakedisler` (proje-genel)
// listede proje adı etiketi GEREKLİ, şantiye "Hakedişler" sekmesinde
// (`SiteProgressPaymentsView`) proje zaten breadcrumb'ta olduğundan
// gürültüdür. İki ekran AYNI bileşeni paylaştığından (T2+T6 ortak gövde)
// tek bir kopyada iki durum da doğrulanır.
const baseItem: ProgressPaymentListItem = {
  id: "22222222-2222-2222-2222-222222222222",
  project_id: "33333333-3333-3333-3333-333333333333",
  project_name: "Güneşkent A-Blok",
  sequence_no: 5,
  period_year: 2026,
  period_month: 5,
  description: "Kat 6–8 döşeme",
  status: "pending_approval",
  gross_total: "2100000.00",
  net_total: "2000000.00",
};

describe("ProgressPaymentsListBody — showProjectName", () => {
  it("varsayılan (verilmezse) proje adı etiketini basar — /hakedisler davranışı", () => {
    render(<ProgressPaymentsListBody isError={false} isLoading={false} data={{ items: [baseItem] }} />);
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
  });

  it("showProjectName=false iken proje adı etiketini BASMAZ — şantiye sekmesi davranışı", () => {
    render(
      <ProgressPaymentsListBody
        isError={false}
        isLoading={false}
        data={{ items: [baseItem] }}
        showProjectName={false}
      />,
    );
    expect(screen.queryByText("Güneşkent A-Blok")).not.toBeInTheDocument();
    // Satırın geri kalanı (başlık, açıklama) hâlâ basılır — yalnız proje
    // etiketi kaldırıldı.
    expect(screen.getByText("#5 — Mayıs 2026")).toBeInTheDocument();
    expect(screen.getByText("Kat 6–8 döşeme")).toBeInTheDocument();
  });
});
