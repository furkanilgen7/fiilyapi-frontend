import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PurchaseOrdersTable } from "./PurchaseOrdersTable";
import type { PurchaseOrderResponse } from "@/lib/api/hooks/usePurchaseOrders";

// Mockup'ın kendi kurgusu: "bugün" 19.07.2026 (SIP 65'teki kırmızı satır).
const TODAY = new Date(2026, 6, 19);

function order(overrides: Partial<PurchaseOrderResponse> = {}): PurchaseOrderResponse {
  return {
    id: "po-1",
    order_no: "SP-2026-042",
    request_id: "pr-1",
    request_no: "SAT-2026-0042",
    quote_id: "q-1",
    supplier_id: "sup-1",
    supplier_name: "Demirsan A.Ş.",
    project_id: "p-1",
    total_amount: "322500.00",
    expected_delivery: "2026-07-19",
    status: "in_transit",
    note: "Acil — Stok kritik",
    created_by_user_id: "u-1",
    created_at: "2026-07-12T08:00:00Z",
    ...overrides,
  };
}

const PROJECTS = new Map([["p-1", "Liman Altyapı"]]);

function renderTable(rows: PurchaseOrderResponse[] | undefined, extra = {}) {
  return render(
    <PurchaseOrdersTable
      rows={rows}
      projectNames={PROJECTS}
      today={TODAY}
      isLoading={false}
      isError={false}
      hasFilter={false}
      {...extra}
    />,
  );
}

describe("PurchaseOrdersTable — SIP 45-125 sütunları", () => {
  it("mockup başlıklarını sırasıyla basar (46-55)", () => {
    renderTable([order()]);
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual([
      "Sipariş No",
      "Malzeme",
      "Tedarikçi",
      "Proje",
      "Miktar",
      "Toplam",
      "Teslimat",
      "Durum",
      "İşlem",
    ]);
  });

  it("sunucunun alanlarını olduğu gibi basar (59-66)", () => {
    renderTable([order()]);
    expect(screen.getByText("SP-2026-042")).toBeInTheDocument();
    expect(screen.getByTestId("sip-request-SP-2026-042").textContent).toBe("SAT-2026-0042");
    expect(screen.getByText("Demirsan A.Ş.")).toBeInTheDocument();
    expect(screen.getByText("Liman Altyapı")).toBeInTheDocument();
    expect(screen.getByText("₺ 322.500")).toBeInTheDocument();
    expect(screen.getByTestId("sip-status-SP-2026-042").textContent).toBe("Yolda");
  });

  // `request_no` TÜREVDİR (JOIN) ve talepsiz siparişte `null`dur.
  it("talepsiz siparişte talep no '—' + görünür gerekçe basar", () => {
    renderTable([order({ request_no: null, request_id: null })]);
    const cell = screen.getByTestId("sip-request-SP-2026-042");
    expect(cell.textContent).toContain("—");
    expect(cell.title).toBe("Talebe bağlı değil — doğrudan sipariş");
  });

  // Kolonlar SİLİNMEZ, veri İCAT EDİLMEZ (sipariş kalem taşımaz).
  it("Malzeme ve Miktar hücreleri '—' + gerekçeyle durur (48, 51)", () => {
    renderTable([order()]);
    expect(screen.getByTestId("sip-material-SP-2026-042").title).toContain("Sipariş kalemleri");
    expect(screen.getByTestId("sip-quantity-SP-2026-042").title).toContain("Sipariş miktarı");
  });

  it("siparişin notu Malzeme hücresinin ikinci satırına düşer (60)", () => {
    renderTable([order()]);
    expect(screen.getByText("Acil — Stok kritik")).toBeInTheDocument();
  });

  it("proje adı çözülemezse uydurma ad basmaz", () => {
    render(
      <PurchaseOrdersTable
        rows={[order({ project_id: "p-gizli" })]}
        projectNames={new Map()}
        today={TODAY}
        isLoading={false}
        isError={false}
        hasFilter={false}
      />,
    );
    expect(screen.getByTitle(/Proje adı çözümlenemedi/)).toBeInTheDocument();
  });
});

describe("PurchaseOrdersTable — teslimat rengi (istemci türevi)", () => {
  it("geçmiş teslimat kırmızı sınıfını alır (65)", () => {
    renderTable([order({ expected_delivery: "2026-07-19" })]);
    expect(screen.getByTestId("sip-delivery-SP-2026-042").className).toContain(
      "sip-delivery--overdue",
    );
  });

  it("yaklaşan teslimat kehribar sınıfını alır (76)", () => {
    renderTable([order({ expected_delivery: "2026-07-24" })]);
    expect(screen.getByTestId("sip-delivery-SP-2026-042").className).toContain(
      "sip-delivery--soon",
    );
  });

  it("teslim edilmiş sipariş geçmiş tarihte bile nötrdür (88)", () => {
    renderTable([order({ expected_delivery: "2026-07-10", status: "delivered" })]);
    const cell = screen.getByTestId("sip-delivery-SP-2026-042");
    expect(cell.className).toContain("sip-delivery--neutral");
    expect(cell.textContent).toBe("10.07.2026");
  });

  it("tarihsiz siparişte '—' basar", () => {
    renderTable([order({ expected_delivery: null })]);
    expect(screen.getByTestId("sip-delivery-SP-2026-042").textContent).toBe("—");
  });
});

describe("PurchaseOrdersTable — devre dışı 'Detay' ve boş durumlar", () => {
  // spec K4: sipariş detay ekranı ÇİZİLMEDİ.
  it("'Detay' düğmesi devre dışıdır ve gerekçesi görünür", () => {
    renderTable([order()]);
    const button = screen.getByTestId("sip-detail-SP-2026-042");
    expect(button).toBeDisabled();
    expect(button.title).toBe("Sipariş detay ekranı henüz çizilmedi");
  });

  it("boş listede mockup'ın örnek satırlarını BASMAZ", () => {
    renderTable([]);
    expect(screen.queryByText("SP-2026-042")).not.toBeInTheDocument();
    expect(screen.getByText("Henüz sipariş yok.")).toBeInTheDocument();
  });

  it("süzgeçli boş listenin metni ayrıdır", () => {
    renderTable([], { hasFilter: true });
    expect(screen.getByText("Bu süzgeçle eşleşen sipariş yok.")).toBeInTheDocument();
  });

  it("hata durumunda sunucunun cümlesi basılır", () => {
    renderTable(undefined, { isError: true, errorMessage: "Sunucu hatası." });
    expect(screen.getByText("Sunucu hatası.")).toBeInTheDocument();
  });

  it("yüklenirken satır basmaz", () => {
    renderTable(undefined, { isLoading: true });
    expect(screen.getByText("Sipariş listesi yükleniyor…")).toBeInTheDocument();
  });
});
