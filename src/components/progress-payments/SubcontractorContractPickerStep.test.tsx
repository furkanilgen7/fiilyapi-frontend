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
    isDerivedFromPayments: true,
    ...overrides,
  });
}

describe("SubcontractorContractPickerStep", () => {
  it("kalıcı bilgi notunu HER ZAMAN basar — seçenek olsun olmasın", () => {
    mockOptions({
      options: [
        {
          contractId: "sc-1",
          contractNo: "TSZ-2025-001",
          subcontractorName: "Akın İnşaat",
          projectId: "p-1",
          projectName: "Güneşkent Konut",
        },
      ],
    });
    render(<SubcontractorContractPickerStep />);
    expect(screen.getByTestId("th-contract-picker-note")).toBeInTheDocument();
  });

  it("boş durumda birebir metni basar", () => {
    mockOptions({ options: [] });
    render(<SubcontractorContractPickerStep />);
    expect(screen.getByTestId("th-contract-picker-note")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Henüz hakedişi olmayan sözleşmeler burada listelenemiyor; sözleşme listesi ucu eklendiğinde tamamı görünecek.",
      ),
    ).toBeInTheDocument();
  });

  it("seçenek varken boş durum metni BASILMAZ", () => {
    mockOptions({
      options: [
        {
          contractId: "sc-1",
          contractNo: "TSZ-2025-001",
          subcontractorName: "Akın İnşaat",
          projectId: "p-1",
          projectName: "Güneşkent Konut",
        },
      ],
    });
    render(<SubcontractorContractPickerStep />);
    expect(screen.queryByTestId("th-contract-picker-empty")).not.toBeInTheDocument();
  });

  it("sözleşme seçilip Devam Et'e basılınca ?contract= ile yönlendirir", async () => {
    mockOptions({
      options: [
        {
          contractId: "sc-1",
          contractNo: "TSZ-2025-001",
          subcontractorName: "Akın İnşaat",
          projectId: "p-1",
          projectName: "Güneşkent Konut",
        },
      ],
    });
    render(<SubcontractorContractPickerStep />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "sc-1");
    await userEvent.click(screen.getByRole("button", { name: "Devam Et" }));
    expect(pushMock).toHaveBeenCalledWith("/hakedisler/taseron/yeni?contract=sc-1");
  });

  it("sözleşme seçilmeden Devam Et devre dışıdır", () => {
    mockOptions({
      options: [
        {
          contractId: "sc-1",
          contractNo: "TSZ-2025-001",
          subcontractorName: "Akın İnşaat",
          projectId: "p-1",
          projectName: "Güneşkent Konut",
        },
      ],
    });
    render(<SubcontractorContractPickerStep />);
    expect(screen.getByRole("button", { name: "Devam Et" })).toBeDisabled();
  });
});
