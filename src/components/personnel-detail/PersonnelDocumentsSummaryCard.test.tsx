import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import {
  DOCUMENT_DOWNLOAD_PENDING_REASON,
  DOCUMENT_NO_FILE_REASON,
} from "@/components/hr-documents/hr-documents-labels";
import {
  usePersonnelDocuments,
  type PersonnelDocumentResponse,
} from "@/lib/api/hooks/useHrDocuments";
import type { PersonnelDetailResponse } from "@/lib/api/hooks/usePersonnelDetail";

import { PersonnelDocumentsSummaryCard } from "./PersonnelDocumentsSummaryCard";

vi.mock("@/lib/api/hooks/useHrDocuments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useHrDocuments")>()),
  usePersonnelDocuments: vi.fn(),
  // Ekleme diyaloğunun tip kataloğu — kart testi ağa çıkmaz.
  useHrDocumentsSummary: vi.fn(() => ({ data: { by_type: [] }, isError: false })),
}));
vi.mock("@/lib/api/hooks/useDocumentMutations", () => ({
  useUploadDocument: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));
vi.mock("@/lib/api/hooks/usePersonnelDocumentMutations", () => ({
  useCreatePersonnelDocument: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

function queryStub(
  data: unknown,
  extra: Partial<{ isLoading: boolean; isError: boolean; error: unknown }> = {},
) {
  return {
    data,
    isLoading: extra.isLoading ?? false,
    isError: extra.isError ?? false,
    error: extra.error ?? null,
  } as unknown as ReturnType<typeof usePersonnelDocuments>;
}

function document(overrides: Partial<PersonnelDocumentResponse> = {}): PersonnelDocumentResponse {
  return {
    id: "pd-1",
    personnel_id: "per-1",
    type_id: "dt-1",
    type_name: "Sağlık Raporu",
    is_mandatory: true,
    validity_months: 12,
    free_label: null,
    document_id: "doc-1",
    issued_at: "2026-06-30",
    valid_until: "2027-06-30",
    note: null,
    status: "valid",
    days_left: 320,
    created_at: "2026-06-30T00:00:00Z",
    updated_at: "2026-06-30T00:00:00Z",
    ...overrides,
  };
}

/** Diyalog bu kayıttan bağlam bandını ve yükleme kapısını okur. */
function personnel(): PersonnelDetailResponse {
  return {
    id: "per-1",
    full_name: "Mehmet Yılmaz",
    trade: "Kalıpçı Usta",
    source: "company",
    sgk_no: "123-456-789-00",
    assigned_project_id: "prj-1",
  } as PersonnelDetailResponse;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePersonnelDocuments).mockReturnValue(queryStub([document()]));
});

describe("PersonnelDocumentsSummaryCard — PD 130-141", () => {
  it("belge satırlarını SUNUCUDAN basar (mockup'ın sahte satırları DEĞİL)", () => {
    render(<PersonnelDocumentsSummaryCard personnel={personnel()} />);
    const row = screen.getByTestId("personnel-document-pd-1");

    expect(row).toHaveTextContent("Sağlık Raporu");
    expect(row).toHaveTextContent("Geçerli · 30.06.2027 tarihine kadar");
  });

  it("dosya uzantısı/boyutu BASILMAZ (sunucuda alan yok)", () => {
    render(<PersonnelDocumentsSummaryCard personnel={personnel()} />);
    expect(screen.getByTestId("personnel-document-pd-1")).not.toHaveTextContent(/PDF|MB|JPG/);
  });

  it("bilinmeyen `status` değerinde ÇÖKMEZ", () => {
    vi.mocked(usePersonnelDocuments).mockReturnValue(
      queryStub([document({ status: "brand_new_backend_state" })]),
    );
    render(<PersonnelDocumentsSummaryCard personnel={personnel()} />);

    expect(screen.getByTestId("personnel-document-pd-1")).toBeInTheDocument();
  });

  it("boş listede sade Türkçe boş-durum basar", () => {
    vi.mocked(usePersonnelDocuments).mockReturnValue(queryStub([]));
    render(<PersonnelDocumentsSummaryCard personnel={personnel()} />);

    expect(screen.getByText("Bu personele ait belge kaydı yok.")).toBeInTheDocument();
  });

  it("'+ Ekle' GERÇEKTİR — belge ekleme diyaloğunu açar (F-BLG T2c)", () => {
    render(<PersonnelDocumentsSummaryCard personnel={personnel()} />);

    const add = screen.getByRole("button", { name: "+ Ekle" });
    expect(add).toBeEnabled();
    fireEvent.click(add);
    expect(screen.getByRole("dialog", { name: "Personel Belgesi Ekle" })).toBeInTheDocument();
  });

  it("'İndir' bu dilimde bağlanmaz; dosyasız kayıtta gerekçe FARKLIdır", () => {
    render(<PersonnelDocumentsSummaryCard personnel={personnel()} />);
    const withFile = within(screen.getByTestId("personnel-document-pd-1")).getByRole("button", {
      name: "İndir",
    });
    expect(withFile).toBeDisabled();
    expect(withFile).toHaveAttribute("title", DOCUMENT_DOWNLOAD_PENDING_REASON);

    vi.mocked(usePersonnelDocuments).mockReturnValue(
      queryStub([document({ id: "pd-2", document_id: null })]),
    );
    render(<PersonnelDocumentsSummaryCard personnel={personnel()} />);
    expect(
      within(screen.getByTestId("personnel-document-pd-2")).getByRole("button", { name: "İndir" }),
    ).toHaveAttribute("title", DOCUMENT_NO_FILE_REASON);
  });
});
