import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SubcontractorProgressPaymentsTable } from "./SubcontractorProgressPaymentsTable";
import type { SubcontractorProgressPaymentListItem } from "@/lib/api/hooks/useSubcontractorProgressPayments";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const BASE_ITEM: SubcontractorProgressPaymentListItem = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  contract_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  project_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  project_name: "Güneşkent A-Blok",
  subcontractor_name: "Akın İnşaat",
  contract_no: "TSD-2026-01",
  work_category: "Kaba İnşaat",
  sequence_no: 47,
  period_year: 2026,
  period_month: 7,
  description: null,
  status: "pending_approval",
  section_id: null,
  created_at: "2026-07-01T00:00:00Z",
  gross_total: "1240000.00",
  net_total: "1016800.00",
  is_revision_required: false,
};

function renderTable(items: SubcontractorProgressPaymentListItem[]) {
  return render(
    <SubcontractorProgressPaymentsTable
      isError={false}
      isLoading={false}
      data={{ items, total: items.length, limit: 50, offset: 0 }}
    />,
  );
}

describe("SubcontractorProgressPaymentsTable", () => {
  it("yukleniyor durumunu basar", () => {
    render(<SubcontractorProgressPaymentsTable isError={false} isLoading data={undefined} />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    render(<SubcontractorProgressPaymentsTable isError isLoading={false} data={undefined} />);
    expect(screen.getByText("Taşeron hakedişleri yüklenemedi")).toBeInTheDocument();
  });

  it("bos listede bos durum metni basar", () => {
    renderTable([]);
    expect(screen.getByText("Henüz taşeron hakedişi oluşturulmadı")).toBeInTheDocument();
  });

  it("8 kolon basligini birebir mockup siralamasiyla basar", () => {
    renderTable([BASE_ITEM]);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Taşeron",
      "Hakediş No",
      "Dönem",
      "Brüt Tutar",
      "KDV",
      "Net Ödeme",
      "Durum",
      "İlerleme",
    ]);
  });

  it("satiri isim, hakedis no, donem, tutarlar ve rozetle basar", () => {
    renderTable([BASE_ITEM]);
    expect(screen.getByText("Akın İnşaat")).toBeInTheDocument();
    expect(screen.getByText("#47")).toBeInTheDocument();
    expect(screen.getByText("Tem 2026")).toBeInTheDocument();
    expect(screen.getByText("₺ 1.240.000")).toBeInTheDocument();
    expect(screen.getByText("₺ 1.016.800")).toBeInTheDocument();
    expect(screen.getByText("Onay Bekliyor")).toBeInTheDocument();
  });

  it("subcontractor_name null ise tirenle basar", () => {
    renderTable([{ ...BASE_ITEM, subcontractor_name: null }]);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("satir linki detay rotasina gider", () => {
    renderTable([BASE_ITEM]);
    expect(screen.getByRole("link", { name: "Akın İnşaat" })).toHaveAttribute(
      "href",
      "/hakedisler/taseron/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );
  });

  it("is_revision_required=true iken durum rozeti YERINE kirmizi Revize Gerekli basar", () => {
    renderTable([{ ...BASE_ITEM, status: "draft", is_revision_required: true }]);
    expect(screen.getByText("Revize Gerekli")).toBeInTheDocument();
    expect(screen.queryByText("Taslak")).not.toBeInTheDocument();
  });

  it("approved durumunda yesil (success), paid durumunda mavi (primary) rozet rengi basar (mockup kaniti)", () => {
    renderTable([
      { ...BASE_ITEM, id: "id-approved", status: "approved" },
      { ...BASE_ITEM, id: "id-paid", status: "paid" },
    ]);
    const approvedBadge = screen.getByText("Onaylandı");
    const paidBadge = screen.getByText("Ödendi");
    expect(approvedBadge).toHaveClass("badge--success");
    expect(paidBadge).toHaveClass("badge--primary");
  });

  it("uc zarif dusus alani (is kategorisi, KDV, ilerleme) yerinde pending gosterge ile basilir, sessizce atlanmaz", () => {
    renderTable([BASE_ITEM]);
    expect(screen.getByTitle("İş kategorisi alanıyla birlikte gelir")).toBeInTheDocument();
    expect(screen.getByTitle("KDV hesaplamasıyla birlikte gelir")).toBeInTheDocument();
    expect(screen.getByTitle("İlerleme takibiyle birlikte gelir")).toBeInTheDocument();
  });

  it("donem null ise tire basar (turetme yok)", () => {
    renderTable([{ ...BASE_ITEM, period_year: null, period_month: null }]);
    expect(screen.queryByText("Tem 2026")).not.toBeInTheDocument();
  });
});
