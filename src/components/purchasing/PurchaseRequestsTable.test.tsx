import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PurchaseRequestsTable, requestSubLine } from "./PurchaseRequestsTable";
import { PURCHASE_REQUEST_STATUS_LABELS } from "./purchasing-labels";
import type {
  PurchaseRequestListRow,
  PurchaseRequestStatus,
} from "@/lib/api/hooks/usePurchaseRequests";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

function row(overrides: Partial<PurchaseRequestListRow> = {}): PurchaseRequestListRow {
  return {
    id: "req-1",
    request_no: "SAT-2026-0042",
    request_date: "2026-08-01",
    priority: "urgent",
    project_id: "prj-1",
    site_id: null,
    section_id: null,
    needed_by: null,
    justification: "Stok kritik",
    status: "pending_approval",
    quote_deadline: null,
    approved_by_user_id: null,
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
    created_by_user_id: "u-1",
    created_at: "2026-08-01T09:00:00Z",
    estimated_total: "328500.00",
    can_delete: true,
    line_count: 3,
    ...overrides,
  };
}

const PROJECT_NAMES = new Map([["prj-1", "Liman Altyapı"]]);

function renderTable(props: Partial<Parameters<typeof PurchaseRequestsTable>[0]> = {}) {
  return render(
    <PurchaseRequestsTable
      rows={[row()]}
      projectNames={PROJECT_NAMES}
      isLoading={false}
      isError={false}
      hasFilter={false}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PurchaseRequestsTable — SAT 97-156 sütunları", () => {
  it("mockup'ın YEDİ sütun başlığını sırasıyla basar", () => {
    renderTable();
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Talep No",
      "Malzeme",
      "Proje",
      "Miktar",
      "Tahmini Tutar",
      "Teklif",
      "Durum",
    ]);
  });

  it("talep no, kalem sayısı, proje adı ve tahmini tutarı basar", () => {
    renderTable();
    expect(screen.getByRole("link", { name: "SAT-2026-0042" })).toHaveAttribute(
      "href",
      "/satinalma/talepler/req-1/teklifler",
    );
    // 113 — satır KALEM TAŞIMAZ; malzeme adı yerine kalem SAYISI basılır.
    expect(screen.getByText("3 kalem")).toBeInTheDocument();
    expect(screen.getByText("Liman Altyapı")).toBeInTheDocument();
    expect(screen.getByText("₺ 328.500")).toBeInTheDocument();
  });

  // Kolon SİLİNMEZ, veri İCAT EDİLMEZ (F-TH/F-P5 emsali).
  it("'Miktar' ve 'Teklif' hücreleri '—' + görünür gerekçe taşır", () => {
    renderTable();
    const quantity = screen.getByTestId("sat-quantity-SAT-2026-0042");
    const quote = screen.getByTestId("sat-quote-SAT-2026-0042");
    expect(quantity.textContent).toContain("—");
    expect(quantity.getAttribute("title")).toBe("Talep miktarı liste ucundan gelmiyor");
    expect(quote.textContent).toContain("—");
    expect(quote.getAttribute("title")).toBe("Teklif sayısı liste ucundan gelmiyor");
  });

  it("proje adı çözülemezse uydurma ad basmaz", () => {
    renderTable({ projectNames: new Map() });
    expect(screen.queryByText("Liman Altyapı")).not.toBeInTheDocument();
    expect(screen.getByTitle(/Proje adı çözümlenemedi/)).toBeInTheDocument();
  });

  it("satır tıklaması teklif karşılaştırma ekranına gider", () => {
    renderTable();
    fireEvent.click(screen.getByTestId("sat-row-SAT-2026-0042"));
    expect(pushMock).toHaveBeenCalledWith("/satinalma/talepler/req-1/teklifler");
  });

  it("veri yokken mockup'ın örnek satırlarını BASMAZ", () => {
    renderTable({ rows: [] });
    expect(screen.queryByText("Nervürlü Demir Ø12")).not.toBeInTheDocument();
    expect(screen.getByText("Henüz satın alma talebi yok.")).toBeInTheDocument();
  });

  it("süzgeçli boş liste ile süzgeçsiz boş listenin metni AYRIDIR", () => {
    renderTable({ rows: [], hasFilter: true });
    expect(screen.getByText("Bu süzgeçle eşleşen satın alma talebi yok.")).toBeInTheDocument();
  });

  it("hata durumunda sunucunun cümlesi basılır", () => {
    renderTable({ rows: [], isError: true, errorMessage: "Yetkiniz yok." });
    expect(screen.getByText("Yetkiniz yok.")).toBeInTheDocument();
  });
});

describe("PurchaseRequestsTable — durum rozetleri (110-155)", () => {
  const STATUSES: PurchaseRequestStatus[] = [
    "draft",
    "pending_approval",
    "quote_wait",
    "ordered",
    "delivered",
    "rejected",
  ];

  // Enum'un ALTI değeri de eşlenir; eşlenmeyen değer sessizce düşmez.
  it.each(STATUSES)("'%s' durumunu rozetle basar", (status) => {
    renderTable({ rows: [row({ status })] });
    expect(screen.getByTestId("sat-status-SAT-2026-0042").textContent).toBe(
      PURCHASE_REQUEST_STATUS_LABELS[status],
    );
  });

  it("mockup'ın dört rozet metni birebirdir", () => {
    expect(PURCHASE_REQUEST_STATUS_LABELS.pending_approval).toBe("Onay Bekliyor"); // 118
    expect(PURCHASE_REQUEST_STATUS_LABELS.quote_wait).toBe("Teklif Bekleniyor"); // 127
    expect(PURCHASE_REQUEST_STATUS_LABELS.ordered).toBe("Sipariş Verildi"); // 136
    expect(PURCHASE_REQUEST_STATUS_LABELS.delivered).toBe("Teslim Edildi"); // 154
  });
});

describe("requestSubLine — SAT 113 malzeme alt satırı", () => {
  it("acil talepte 'Acil · gerekçe' basar (113)", () => {
    expect(requestSubLine(row())).toBe("Acil · Stok kritik");
  });

  it("normal öncelikte yalnız gerekçeyi basar (122 · 131 · 140 · 149)", () => {
    expect(requestSubLine(row({ priority: "normal", justification: "Kat 9 döşeme" }))).toBe(
      "Kat 9 döşeme",
    );
  });

  it("gerekçe boşsa yalnız önceliği basar", () => {
    expect(requestSubLine(row({ priority: "critical", justification: null }))).toBe("Kritik");
  });

  it("ikisi de yoksa boş döner (uydurma metin YOK)", () => {
    expect(requestSubLine(row({ priority: "normal", justification: null }))).toBe("");
  });
});
