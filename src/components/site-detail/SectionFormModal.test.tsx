import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { SectionFormModal } from "./SectionFormModal";
import { useCreateSection } from "@/lib/api/hooks/useSectionMutations";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useSectionMutations", () => ({ useCreateSection: vi.fn() }));

const mutate = vi.fn();

function setup() {
  vi.mocked(useCreateSection).mockReturnValue({ mutate, isPending: false } as never);
  render(<SectionFormModal siteId="site-1" onClose={() => {}} />);
}

describe("SectionFormModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tum alanlari etiketleriyle render eder", () => {
    setup();
    expect(screen.getByLabelText("Ad")).toBeInTheDocument();
    expect(screen.getByLabelText("Kod")).toBeInTheDocument();
    expect(screen.getByLabelText("Durum")).toBeInTheDocument();
    expect(screen.getByLabelText("Sorumlu")).toBeInTheDocument();
    expect(screen.getByLabelText("Başlangıç Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Bitiş Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Sıra")).toBeInTheDocument();
  });

  it("durum varsayilan olarak Planlandi'dir", () => {
    setup();
    expect(screen.getByLabelText("Durum")).toHaveValue("planned");
  });

  it("ad bos ise zorunlu alan hatasi gosterir ve gonderilmez", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByText("Ad zorunludur.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("gecerli formda mutate cagirilir, kod bos ise gonderilmez", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Temel & Bodrum Katlar" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Temel & Bodrum Katlar", status: "planned", sort_order: 0 }),
      expect.anything(),
    );
    const payload = mutate.mock.calls[0][0];
    expect(payload).not.toHaveProperty("code");
    expect(payload).not.toHaveProperty("manager_name");
    expect(payload).not.toHaveProperty("start_date");
    expect(payload).not.toHaveProperty("end_date");
  });

  it("kod girilirse istekte gonderilir", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Temel" } });
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "BLM-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ code: "BLM-01" }),
      expect.anything(),
    );
  });

  it("sorumlu ve tarih alanlari doldurulursa istekte gonderilir", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Temel" } });
    fireEvent.change(screen.getByLabelText("Sorumlu"), { target: { value: "M. Arslan" } });
    fireEvent.change(screen.getByLabelText("Başlangıç Tarihi"), { target: { value: "2025-04-01" } });
    fireEvent.change(screen.getByLabelText("Bitiş Tarihi"), { target: { value: "2025-07-01" } });
    fireEvent.change(screen.getByLabelText("Sıra"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        manager_name: "M. Arslan",
        start_date: "2025-04-01",
        end_date: "2025-07-01",
        sort_order: 2,
      }),
      expect.anything(),
    );
  });

  it("409 kod cakismasinda anlasilir Turkce mesaj gosterir", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Temel" } });
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "BLM-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    const onError = mutate.mock.calls[0][1].onError;
    act(() => onError(new BackendError(409, { detail: "duplicate key value" })));

    expect(
      screen.getByText("Bu bölüm kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın."),
    ).toBeInTheDocument();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});
