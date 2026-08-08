import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SubcontractorContractPickerStep } from "./SubcontractorContractPickerStep";
import { useSubcontractorContractOptions } from "@/lib/api/hooks/useSubcontractorContractOptions";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/lib/api/hooks/useSubcontractorContractOptions", () => ({
  useSubcontractorContractOptions: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function mockOptions(overrides: Partial<ReturnType<typeof useSubcontractorContractOptions>> = {}) {
  vi.mocked(useSubcontractorContractOptions).mockReturnValue({
    options: [],
    isLoading: false,
    isError: false,
    error: null,
    isPartial: false,
    truncation: { isTruncated: false, shownCount: 0, totalCount: 0 },
    ...overrides,
  });
}

const CONTRACT_OPTION = {
  contractId: "sc-1",
  contractNo: "TSZ-2025-001",
  subcontractorName: "Akın İnşaat",
  projectId: "p-1",
  projectName: "Güneşkent Konut",
};

describe("SubcontractorContractPickerStep", () => {
  it("boş durumda Türkçe boş-durum metni basar", () => {
    mockOptions({ options: [] });
    render(<SubcontractorContractPickerStep />);
    expect(screen.getByTestId("th-contract-picker-empty")).toBeInTheDocument();
    expect(screen.getByText("Henüz kayıtlı taşeron sözleşmesi yok.")).toBeInTheDocument();
  });

  it("seçenek varken boş durum metni BASILMAZ", () => {
    mockOptions({ options: [CONTRACT_OPTION] });
    render(<SubcontractorContractPickerStep />);
    expect(screen.queryByTestId("th-contract-picker-empty")).not.toBeInTheDocument();
  });

  it("sözleşme seçilip Devam Et'e basılınca ?contract= ile yönlendirir", async () => {
    mockOptions({ options: [CONTRACT_OPTION] });
    render(<SubcontractorContractPickerStep />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "sc-1");
    await userEvent.click(screen.getByRole("button", { name: "Devam Et" }));
    expect(pushMock).toHaveBeenCalledWith("/hakedisler/taseron/yeni?contract=sc-1");
  });

  it("sözleşme seçilmeden Devam Et devre dışıdır", () => {
    mockOptions({ options: [CONTRACT_OPTION] });
    render(<SubcontractorContractPickerStep />);
    expect(screen.getByRole("button", { name: "Devam Et" })).toBeDisabled();
  });

  it("yükleniyor durumunda mesaj basar", () => {
    mockOptions({ isLoading: true });
    render(<SubcontractorContractPickerStep />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    mockOptions({ isError: true, error: new Error("boom") });
    render(<SubcontractorContractPickerStep />);
    expect(screen.getByText("Sözleşme listesi yüklenemedi.")).toBeInTheDocument();
  });

  // TB2 takip — kalıcı geçiş dönemi bilgi notu (Alert) kaldırıldı; U1 liste
  // ucu geldiğinden sınır (yalnız hakedişi olan sözleşmeler görünür) bitti.
  it("geçiş dönemi bilgi notu ARTIK basılmaz", () => {
    mockOptions({ options: [CONTRACT_OPTION] });
    render(<SubcontractorContractPickerStep />);
    expect(screen.queryByTestId("th-contract-picker-note")).not.toBeInTheDocument();
    expect(screen.queryByTestId("th-contract-picker-truncated")).not.toBeInTheDocument();
  });

  // F-P5 T1 — TB3 ile U1 sayfalandı: kırpılma SESSİZ kalamaz.
  it("liste sunucu tavanında kırpıldıysa görünür uyarı basar", () => {
    mockOptions({
      options: [CONTRACT_OPTION],
      isPartial: true,
      truncation: { isTruncated: true, shownCount: 200, totalCount: 315 },
    });
    render(<SubcontractorContractPickerStep />);
    const note = screen.getByTestId("th-contract-picker-limit-note");
    expect(note).toHaveTextContent("İlk 200 kayıt gösteriliyor (toplam 315)");
    expect(note).toHaveTextContent("Aradığınız sözleşme listede olmayabilir.");
  });

  it("kırpılma yokken uyarı BASILMAZ", () => {
    mockOptions({ options: [CONTRACT_OPTION] });
    render(<SubcontractorContractPickerStep />);
    expect(screen.queryByTestId("th-contract-picker-limit-note")).not.toBeInTheDocument();
  });
});
