import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { EmployerItemFormModal } from "./EmployerItemFormModal";
import {
  EMPLOYER_ITEM_TEXT as TEXT,
  ESCALATION_OPTIONS,
  ESCALATION_READONLY_REASON,
  INDEX_TYPE_LABELS,
} from "./constants";
import {
  useCreateEmployerContractGroup,
  useCreateEmployerContractItem,
} from "@/lib/api/hooks/useContractMutations";
import type {
  EmployerContractDetail,
  EmployerContractItemsResponse,
} from "@/lib/api/hooks/useContract";

vi.mock("@/lib/api/hooks/useContractMutations", () => ({
  useCreateEmployerContractItem: vi.fn(),
  useCreateEmployerContractGroup: vi.fn(),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const PROJECT_ID = "pppppppp-0000-0000-0000-000000000001";
const GROUP_ID = "gggggggg-0000-0000-0000-000000000002";
const NEW_GROUP_ID = "gggggggg-0000-0000-0000-000000000009";

const GROUPS: EmployerContractItemsResponse["groups"] = [
  {
    id: GROUP_ID,
    name: "B — Betonarme İşleri",
    sort_order: 20,
    items: [
      {
        id: "iiiiiiii-0000-0000-0000-000000000001",
        group_id: GROUP_ID,
        code: "03.011",
        description: "Grobeton",
        unit: "m³",
        quantity: "100.000",
        unit_price: "1200.00",
        sort_order: 10,
        distributed_quantity: "100.000",
        remaining_quantity: "0.000",
      },
    ],
  },
];

// Ekranın kullandığı alanlar dışındaki şema alanları testte gerekmez;
// `as unknown as` yerine tam nesne kurmak yerine kısmi nesne + tip daraltma
// yapılmaz — gerekli alanlar tek tek verilir.
const DETAIL = {
  project_id: PROJECT_ID,
  amount: "22400000.00",
  has_price_escalation: true,
  index_type: "ufe",
} as EmployerContractDetail;

const createItem = vi.fn();
const createGroup = vi.fn();
const onClose = vi.fn();

function renderModal(
  detail: EmployerContractDetail = DETAIL,
  groups: EmployerContractItemsResponse["groups"] = GROUPS,
) {
  return render(
    <EmployerItemFormModal
      projectId={PROJECT_ID}
      groups={groups}
      detail={detail}
      onClose={onClose}
    />,
  );
}

function fillAll() {
  fireEvent.change(screen.getByLabelText(TEXT.group), { target: { value: GROUP_ID } });
  fireEvent.change(screen.getByLabelText(TEXT.code), { target: { value: "03.012" } });
  fireEvent.change(screen.getByLabelText(TEXT.description), {
    target: { value: "Perde betonu C30/37" },
  });
  fireEvent.change(screen.getByLabelText(TEXT.unit), { target: { value: "m³" } });
  fireEvent.change(screen.getByLabelText(TEXT.quantity), { target: { value: "1240.5" } });
  fireEvent.change(screen.getByLabelText(TEXT.unitPrice), { target: { value: "2850.75" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  createItem.mockResolvedValue({});
  vi.mocked(useCreateEmployerContractItem).mockReturnValue({
    mutateAsync: createItem,
    isPending: false,
  } as never);
  createGroup.mockResolvedValue({ id: NEW_GROUP_ID, name: "C — Kaba İşler", sort_order: 30 });
  vi.mocked(useCreateEmployerContractGroup).mockReturnValue({
    mutateAsync: createGroup,
    isPending: false,
  } as never);
});

describe("EmployerItemFormModal (İŞV · Form - Poz Ekle Isveren)", () => {
  it("🔴 fiyat farkı alanları SALT-OKUNURdur ve sözleşmenin değerini gösterir", () => {
    renderModal();
    const escalation = screen.getByTestId("eci-escalation");
    const indexType = screen.getByTestId("eci-index-type");
    expect(escalation).toBeDisabled();
    expect(indexType).toBeDisabled();
    expect(escalation).toHaveValue("yes");
    expect(indexType).toHaveValue("ufe");
    // Gerekçe `title`da saklı kalmaz.
    expect(screen.getByTestId("eci-escalation-reason")).toHaveTextContent(
      ESCALATION_READONLY_REASON,
    );
    // Mockup'ın dört endeks seçeneği de basılır (192-196).
    for (const label of Object.values(INDEX_TYPE_LABELS)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(ESCALATION_OPTIONS.no)).toBeInTheDocument();
  });

  it("sözleşmede fiyat farkı kapalıysa `Hayır` gösterir (uydurulmaz)", () => {
    renderModal({ ...DETAIL, has_price_escalation: false, index_type: null });
    expect(screen.getByTestId("eci-escalation")).toHaveValue("no");
    expect(screen.getByTestId("eci-index-type")).toHaveValue("");
  });

  it("🔴 gövde YALNIZ şema alanlarını taşır — fiyat farkı alanları GİRMEZ", async () => {
    renderModal();
    fillAll();
    fireEvent.click(screen.getByRole("button", { name: TEXT.submit }));

    await waitFor(() => expect(createItem).toHaveBeenCalledTimes(1));
    const body = createItem.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toEqual({
      group_id: GROUP_ID,
      code: "03.012",
      description: "Perde betonu C30/37",
      unit: "m³",
      quantity: "1240.5",
      unit_price: "2850.75",
      // Grup içi en büyük sıra (10) + 1; mockup'ın "11"i göstermeliktir.
      sort_order: 11,
    });
    expect(Object.keys(body)).not.toContain("has_price_escalation");
    expect(Object.keys(body)).not.toContain("index_type");
  });

  it("🔴 birim fiyat boşken AĞA ÇIKMAZ (TAŞ formunun tersi)", async () => {
    renderModal();
    fillAll();
    fireEvent.change(screen.getByLabelText(TEXT.unitPrice), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: TEXT.submit }));

    await waitFor(() =>
      expect(screen.getByTestId("eci-error")).toHaveTextContent("Birim Fiyat zorunludur."),
    );
    expect(createItem).not.toHaveBeenCalled();
  });

  it("grup seçilmeden ağa çıkmaz", async () => {
    renderModal();
    fillAll();
    fireEvent.change(screen.getByLabelText(TEXT.group), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: TEXT.submit }));

    await waitFor(() =>
      expect(screen.getByTestId("eci-error")).toHaveTextContent("Poz Grubu zorunludur."),
    );
    expect(createItem).not.toHaveBeenCalled();
  });

  it("işaretliyken kaydetme sonrası poz dağılımı ekranına gider", async () => {
    renderModal();
    fillAll();
    fireEvent.click(screen.getByRole("button", { name: TEXT.submit }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith(`/sozlesmeler/isveren/${PROJECT_ID}/poz-dagilimi`);
  });

  it("onay kutusu kaldırılınca yönlendirme YAPILMAZ", async () => {
    renderModal();
    fireEvent.click(screen.getByTestId("eci-go-distribution"));
    fillAll();
    fireEvent.click(screen.getByRole("button", { name: TEXT.submit }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
  });

  it("sözleşme bedeli boşken sessiz `0` yazmaz", () => {
    renderModal({ ...DETAIL, amount: null });
    expect(screen.getByTestId("eci-contract-total")).toHaveTextContent("—");
  });
});
