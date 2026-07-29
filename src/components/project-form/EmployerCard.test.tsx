import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { EmployerCard, emptyEmployerValues, type EmployerValues } from "./EmployerCard";
import { useEmployers } from "@/lib/api/hooks/useEmployers";
import { useCreateEmployer } from "@/lib/api/hooks/useEmployerMutations";

vi.mock("@/lib/api/hooks/useEmployers", () => ({ useEmployers: vi.fn() }));
vi.mock("@/lib/api/hooks/useEmployerMutations", () => ({ useCreateEmployer: vi.fn() }));

const EMPLOYERS = [
  {
    id: "emp-1",
    name: "Güneşkent Gayrimenkul A.Ş.",
    tax_number: "9876543210",
    contact_person: "Ahmet Güneş",
    is_active: true,
  },
  {
    id: "emp-2",
    name: "Çelik Holding A.Ş.",
    tax_number: "1234567890",
    contact_person: "Zeynep Çelik",
    is_active: true,
  },
];

const createMutate = vi.fn();

function mockEmployerList() {
  vi.mocked(useEmployers).mockReturnValue({
    data: { items: EMPLOYERS },
  } as never);
}

/** onChange'i gercek bir state'e bagli basit harness (yeni-isveren-secili akisi icin). */
function Harness({ initial = emptyEmployerValues() }: { initial?: EmployerValues }) {
  const [values, setValues] = useState(initial);
  return (
    <EmployerCard
      values={values}
      onChange={(field, value) =>
        setValues((prev) => ({ ...prev, [field]: value }))
      }
    />
  );
}

describe("EmployerCard (F7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateEmployer).mockReturnValue({ mutate: createMutate, isPending: false } as never);
  });

  it("İşveren Firma seçicisini GET /employers sonuçları + 'Yeni İşveren Ekle' ile render eder", () => {
    mockEmployerList();
    render(<EmployerCard values={emptyEmployerValues()} onChange={() => {}} />);

    const select = screen.getByLabelText("İşveren Firma") as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.textContent);
    expect(optionLabels).toEqual([
      "Seçiniz veya yeni ekle…",
      "Güneşkent Gayrimenkul A.Ş.",
      "Çelik Holding A.Ş.",
      "+ Yeni İşveren Ekle",
    ]);
  });

  it("işveren seçilmemişken VKN ve Yetkili Kişi boş ve disabled'dır", () => {
    mockEmployerList();
    render(<EmployerCard values={emptyEmployerValues()} onChange={() => {}} />);

    const vkn = screen.getByLabelText("VKN") as HTMLInputElement;
    const contact = screen.getByLabelText("Yetkili Kişi") as HTMLInputElement;
    expect(vkn.value).toBe("");
    expect(vkn).toBeDisabled();
    expect(contact.value).toBe("");
    expect(contact).toBeDisabled();
  });

  it("işveren seçilince VKN/Yetkili Kişi kayıtlı değerlerle dolar ve readOnly olur", () => {
    mockEmployerList();
    render(<EmployerCard values={{ employerId: "emp-1" }} onChange={() => {}} />);

    const vkn = screen.getByLabelText("VKN") as HTMLInputElement;
    const contact = screen.getByLabelText("Yetkili Kişi") as HTMLInputElement;
    expect(vkn.value).toBe("9876543210");
    expect(vkn).toHaveAttribute("readonly");
    expect(vkn).not.toBeDisabled();
    expect(contact.value).toBe("Ahmet Güneş");
    expect(contact).toHaveAttribute("readonly");
  });

  it("'+ Yeni İşveren Ekle' seçimi EmployerFormModal'ı açar", () => {
    mockEmployerList();
    render(<EmployerCard values={emptyEmployerValues()} onChange={() => {}} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("İşveren Firma"), {
      target: { value: "__new__" },
    });
    expect(screen.getByRole("dialog", { name: "Yeni İşveren Ekle" })).toBeInTheDocument();
  });

  it("modalda başarıyla oluşturulan işveren otomatik seçili gelir", () => {
    mockEmployerList();
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("İşveren Firma"), {
      target: { value: "__new__" },
    });
    fireEvent.change(screen.getByLabelText("Ticari Ünvan"), {
      target: { value: "Bursa Belediyesi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    const created = {
      id: "emp-3",
      name: "Bursa Belediyesi",
      tax_number: null,
      contact_person: null,
      is_active: true,
    };
    const onSuccess = createMutate.mock.calls[0][1].onSuccess;
    act(() => onSuccess(created));

    // Modal kapanmış ve yeni işveren seçicide otomatik seçili.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect((screen.getByLabelText("İşveren Firma") as HTMLSelectElement).value).toBe("emp-3");
  });
});
