import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { SubcontractorContractCreateView } from "./SubcontractorContractCreateView";
import { ADD_ITEM_PENDING_REASON, FSO_TEXT } from "./constants";
import { CONTRACT_DOCUMENTS, CONTRACT_DOCUMENTS_SOON_TITLE } from "./documents";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useSites } from "@/lib/api/hooks/useSites";
import { useSubcontractors } from "@/lib/api/hooks/useSubcontractors";
import { useEmployerContract } from "@/lib/api/hooks/useContract";
import { useSubcontractorContract } from "@/lib/api/hooks/useSubcontractorProgressPayments";
import { useCreateSubcontractor } from "@/lib/api/hooks/useSubcontractorMutations";
import type { SubcontractorContractDetail } from "@/lib/api/hooks/useSubcontractorProgressPayments";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/sozlesmeler/taseron/yeni",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/useModulePermission", () => ({
  useModulePermission: () => ({
    level: "full",
    canView: true,
    canWrite: true,
    canDelete: true,
  }),
}));

vi.mock("@/lib/api/hooks/useProjects", () => ({ useProjects: vi.fn() }));
vi.mock("@/lib/api/hooks/useSites", () => ({ useSites: vi.fn() }));
vi.mock("@/lib/api/hooks/useSubcontractors", () => ({ useSubcontractors: vi.fn() }));
vi.mock("@/lib/api/hooks/useContract", () => ({ useEmployerContract: vi.fn() }));
vi.mock("@/lib/api/hooks/useSubcontractorProgressPayments", () => ({
  useSubcontractorContract: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSubcontractorMutations", () => ({
  useCreateSubcontractor: vi.fn(),
}));

const createContractMock = vi.fn();
const updateContractMock = vi.fn();
const loadItemsMock = vi.fn();
const updateItemMock = vi.fn();
const deleteItemMock = vi.fn();
vi.mock("@/lib/api/hooks/useSubcontractorContractMutations", () => ({
  useCreateSubcontractorContract: () => ({ mutate: createContractMock, isPending: false }),
  useUpdateSubcontractorContract: () => ({ mutate: updateContractMock, isPending: false }),
  useLoadSubcontractorContractItemsFromEmployer: () => ({
    mutate: loadItemsMock,
    isPending: false,
  }),
  useUpdateSubcontractorContractItem: () => ({ mutate: updateItemMock, isPending: false }),
  useDeleteSubcontractorContractItem: () => ({ mutate: deleteItemMock, isPending: false }),
}));

const FIRM = {
  id: "sub-1",
  name: "Akın İnşaat Ltd. Şti.",
  tax_number: "1234567890",
  contact_person: "Akın Demir",
  phone: "0212 555 00 01",
  email: "info@akininsaat.com",
  category: "Betonarme",
  is_active: true,
};

const DETAIL = {
  id: "sc-new-1",
  project_id: "p-1",
  contract_total: "1440000.00",
  items_missing_price: 1,
  items: [
    {
      id: "sci-1",
      contract_id: "sc-new-1",
      source_contract_item_id: "eci-1",
      code: "03.001",
      description: "Kat Döşemesi Betonu C25/30",
      unit: "m³",
      quantity: "1200.000",
      unit_price: "1200.00",
      sort_order: 0,
      group: { id: "g-a", name: "A — Betonarme İşleri" },
      line_total: "1440000.00",
    },
  ],
} as unknown as SubcontractorContractDetail;

function query<T>(data: T | undefined, extra: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, error: null, ...extra } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useProjects).mockReturnValue(
    query({ items: [{ id: "p-1", name: "Güneşkent Konut" }], counts: {} }),
  );
  vi.mocked(useSites).mockReturnValue(
    query({ items: [{ id: "s-1", name: "A-Blok Şantiyesi" }], counts: {}, totals: {} }),
  );
  vi.mocked(useSubcontractors).mockReturnValue(query({ items: [FIRM] }));
  vi.mocked(useEmployerContract).mockReturnValue(query({ contract_no: "SZL-2025-001" }));
  vi.mocked(useSubcontractorContract).mockReturnValue(query(undefined));
  vi.mocked(useCreateSubcontractor).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
});

describe("FSO — beş kart", () => {
  it("mockup'ın beş kartını da basar", () => {
    render(<SubcontractorContractCreateView />);
    for (const title of [
      FSO_TEXT.projectCard,
      FSO_TEXT.subcontractorCard,
      FSO_TEXT.termsCard,
      FSO_TEXT.itemsCard,
      FSO_TEXT.documentsCard,
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("64 · işveren sözleşmesi SALT OKUNUR gösterilir", () => {
    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Proje" }), {
      target: { value: "p-1" },
    });
    expect(screen.getByTestId("fso-employer-contract")).toHaveTextContent("SZL-2025-001");
  });

  it("190-230 · altı belge kutusu SİLİNMEZ, devre dışı + gerekçelidir", () => {
    render(<SubcontractorContractCreateView />);
    for (const doc of CONTRACT_DOCUMENTS) {
      const box = screen.getByText(doc.title).closest(".pf-doc");
      expect(box, doc.title).not.toBeNull();
      expect(box).toHaveAttribute("aria-disabled", "true");
      expect(box).toHaveAttribute("title", CONTRACT_DOCUMENTS_SOON_TITLE);
    }
    expect(CONTRACT_DOCUMENTS).toHaveLength(6);
  });

  it("116/174 · elle poz ekleme girişleri devre dışı + gerekçelidir", () => {
    render(<SubcontractorContractCreateView />);
    expect(screen.getByRole("button", { name: FSO_TEXT.addItem })).toHaveAttribute(
      "title",
      ADD_ITEM_PENDING_REASON,
    );
  });
});

describe("Taşeron Bilgileri — seçim ve modal", () => {
  it("78-81 · taşeron seçilince salt-okunur alanlar dolar", () => {
    render(<SubcontractorContractCreateView />);
    expect(screen.getByTestId("fso-tax-number")).toHaveTextContent("—");

    fireEvent.change(screen.getByRole("combobox", { name: "Taşeron Firma" }), {
      target: { value: "sub-1" },
    });

    expect(screen.getByTestId("fso-tax-number")).toHaveTextContent("1234567890");
    expect(screen.getByTestId("fso-contact-person")).toHaveTextContent("Akın Demir");
    expect(screen.getByTestId("fso-phone")).toHaveTextContent("0212 555 00 01");
    expect(screen.getByTestId("fso-email")).toHaveTextContent("info@akininsaat.com");
  });

  it("'+ Yeni Taşeron Ekle' T5'in PAYLAŞILAN modalını açar", () => {
    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Taşeron Firma" }), {
      target: { value: "__new__" },
    });
    expect(screen.getByRole("heading", { name: "Yeni Taşeron Ekle" })).toBeInTheDocument();
  });

  it("modalın `onCreated`i dönen kaydı SEÇİLİ yapar ve alanları doldurur", async () => {
    const newFirm = { ...FIRM, id: "sub-9", name: "Yeni Firma", tax_number: "9999999999" };
    // Modal başarıda `onCreated(kayıt)` çağırır — burada mutasyon taklit edilir.
    vi.mocked(useCreateSubcontractor).mockReturnValue({
      mutate: (_body: unknown, options?: { onSuccess?: (data: unknown) => void }) =>
        options?.onSuccess?.(newFirm),
      isPending: false,
    } as never);
    vi.mocked(useSubcontractors).mockReturnValue(query({ items: [FIRM, newFirm] }));

    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Taşeron Firma" }), {
      target: { value: "__new__" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Ticari Ünvan" }), {
      target: { value: "Yeni Firma" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Taşeron Firma" })).toHaveValue("sub-9"),
    );
    expect(screen.getByTestId("fso-tax-number")).toHaveTextContent("9999999999");
  });
});

describe("Poz listesi — load-from-employer akışı", () => {
  it("proje seçilmeden yükleme butonu gerekçeli kapalıdır", () => {
    render(<SubcontractorContractCreateView />);
    expect(screen.getByRole("button", { name: FSO_TEXT.loadFromEmployer })).toBeDisabled();
  });

  it("önce taslak açar, sonra created/skipped bildirimini basar", async () => {
    createContractMock.mockImplementation(
      (_body: unknown, options?: { onSuccess?: (data: unknown) => void }) =>
        options?.onSuccess?.({ id: "sc-new-1" }),
    );
    loadItemsMock.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: (data: unknown) => void }) =>
        options?.onSuccess?.({ created_count: 4, skipped_count: 2 }),
    );

    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Proje" }), {
      target: { value: "p-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: FSO_TEXT.loadFromEmployer }));

    await waitFor(() => expect(loadItemsMock).toHaveBeenCalled());
    // Taslak gövdesiyle açılır — kullanıcı için TEK tıklamadır.
    expect(createContractMock.mock.calls[0][0]).toMatchObject({ is_draft: true });
    expect(await screen.findByTestId("fso-load-notice")).toHaveTextContent(
      "İşveren sözleşmesinden 4 poz eklendi, 2 poz zaten listede olduğu için atlandı.",
    );
  });

  it("sözleşme detayı gelince tablo + items_missing_price uyarısı basılır", () => {
    vi.mocked(useSubcontractorContract).mockReturnValue(query(DETAIL));
    render(<SubcontractorContractCreateView />);
    expect(screen.getByText("Kat Döşemesi Betonu C25/30")).toBeInTheDocument();
    expect(screen.getByTestId("fso-missing-price")).toHaveTextContent(/1 pozun/);
    expect(screen.getByTestId("fso-items-total")).toHaveTextContent("1.440.000");
  });

  it("fiyat hücresi boşaltılınca uca `null` gider — `0` DEĞİL", () => {
    vi.mocked(useSubcontractorContract).mockReturnValue(query(DETAIL));
    render(<SubcontractorContractCreateView />);
    const input = screen.getByLabelText("03.001 taşeron birim fiyatı");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(updateItemMock).toHaveBeenCalledWith(
      { itemId: "sci-1", body: { unit_price: null } },
      expect.anything(),
    );
  });
});

describe("doğrulama ve alt eylemler", () => {
  it("eksik formda 'Sözleşmeyi Oluştur' istek AÇMAZ, hata basar", () => {
    render(<SubcontractorContractCreateView />);
    fireEvent.click(screen.getAllByRole("button", { name: FSO_TEXT.submit })[0]);
    expect(createContractMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("fso-form-error")).toBeInTheDocument();
  });

  it("taslak yalnız projeyle kaydedilir ve gövdesi `is_draft: true` taşır", () => {
    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Proje" }), {
      target: { value: "p-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    expect(createContractMock).toHaveBeenCalledTimes(1);
    expect(createContractMock.mock.calls[0][0]).toMatchObject({ is_draft: true });
  });

  it("tam dolu formda oluştur gövdesi `is_draft: false` taşır", () => {
    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Proje" }), {
      target: { value: "p-1" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Şantiye" }), {
      target: { value: "s-1" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Taşeron Firma" }), {
      target: { value: "sub-1" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "İş Kategorisi" }), {
      target: { value: "Betonarme" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Sözleşme No" }), {
      target: { value: "TSZ-2026-004" },
    });
    fireEvent.change(screen.getByLabelText("İmza Tarihi"), {
      target: { value: "2026-01-10" },
    });
    fireEvent.change(screen.getByLabelText("İşe Başlama"), {
      target: { value: "2026-01-15" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş Tarihi"), {
      target: { value: "2026-06-30" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: FSO_TEXT.submit })[0]);
    expect(createContractMock).toHaveBeenCalledTimes(1);
    expect(createContractMock.mock.calls[0][0]).toMatchObject({
      is_draft: false,
      site_id: "s-1",
      subcontractor_id: "sub-1",
      work_category: "Betonarme",
      contract_no: "TSZ-2026-004",
    });
  });

  it("oran 0-100 dışındayken kaydetmez", () => {
    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Proje" }), {
      target: { value: "p-1" },
    });
    fireEvent.change(screen.getByLabelText("Avans Oranı (%)"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    expect(createContractMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("fso-form-error")).toHaveTextContent(
      "Oran 0 ile 100 arasında olmalıdır.",
    );
  });

  it("metin girişleri şema sınırını `maxLength` olarak taşır", () => {
    render(<SubcontractorContractCreateView />);
    expect(screen.getByRole("textbox", { name: "Sözleşme No" })).toHaveAttribute(
      "maxLength",
      "100",
    );
  });

  it("taslak kurulduktan sonra İKİNCİ sözleşme açılmaz, PATCH edilir", async () => {
    createContractMock.mockImplementation(
      (_body: unknown, options?: { onSuccess?: (data: unknown) => void }) =>
        options?.onSuccess?.({ id: "sc-new-1" }),
    );
    render(<SubcontractorContractCreateView />);
    fireEvent.change(screen.getByRole("combobox", { name: "Proje" }), {
      target: { value: "p-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: FSO_TEXT.loadFromEmployer }));
    await waitFor(() => expect(loadItemsMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Taslak Kaydet" }));
    expect(createContractMock).toHaveBeenCalledTimes(1);
    expect(updateContractMock).toHaveBeenCalledTimes(1);
  });

  it("İptal sözleşme listesinin taşeron sekmesine döner", () => {
    render(<SubcontractorContractCreateView />);
    fireEvent.click(screen.getAllByRole("button", { name: "İptal" })[0]);
    expect(pushMock).toHaveBeenCalledWith("/sozlesmeler?type=subcontractor");
  });
});
