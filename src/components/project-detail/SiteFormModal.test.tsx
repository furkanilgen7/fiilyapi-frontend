import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { SiteFormModal } from "./SiteFormModal";
import { useCreateSite } from "@/lib/api/hooks/useSiteMutations";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useSiteMutations", () => ({ useCreateSite: vi.fn() }));

const mutate = vi.fn();

function setup() {
  vi.mocked(useCreateSite).mockReturnValue({ mutate, isPending: false } as never);
  render(<SiteFormModal projectId="proj-1" onClose={() => {}} />);
}

describe("SiteFormModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tum alanlari etiketleriyle render eder", () => {
    setup();
    expect(screen.getByLabelText("Ad")).toBeInTheDocument();
    expect(screen.getByLabelText("Kod")).toBeInTheDocument();
    expect(screen.getByLabelText("Durum")).toBeInTheDocument();
    expect(screen.getByLabelText("Adres")).toBeInTheDocument();
    expect(screen.getByLabelText("Şehir")).toBeInTheDocument();
    expect(screen.getByLabelText("Şantiye Şefi")).toBeInTheDocument();
    expect(screen.getByLabelText("Başlangıç Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Bitiş Tarihi")).toBeInTheDocument();
    expect(screen.getByLabelText("Teslim Tarihi")).toBeInTheDocument();
  });

  it("şantiye şefi serbest metin girişidir, select degildir", () => {
    setup();
    const field = screen.getByLabelText("Şantiye Şefi");
    expect(field.tagName).toBe("INPUT");
  });

  it("kod alaninda bos birakilirsa backend'in turetecegini soyleyen ipucu gosterir", () => {
    setup();
    expect(screen.getByText(/Boş bırakılırsa kod otomatik oluşturulur/i)).toBeInTheDocument();
  });

  it("ad bos ise zorunlu alan hatasi gosterir ve gonderilmez", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByText("Ad zorunludur.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("gecerli formda mutate cagirilir, kod bos ise gonderilmez", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "A-Blok Şantiyesi" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "A-Blok Şantiyesi", status: "active" }),
      expect.anything(),
    );
    const payload = mutate.mock.calls[0][0];
    expect(payload).not.toHaveProperty("code");
  });

  it("kod girilirse istekte gonderilir", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "A-Blok" } });
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "SNT-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SNT-01" }),
      expect.anything(),
    );
  });

  it("409 kod cakismasinda anlasilir Turkce mesaj gosterir", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "A-Blok" } });
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "SNT-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    const onError = mutate.mock.calls[0][1].onError;
    act(() => onError(new BackendError(409, { detail: "duplicate key value" })));

    expect(
      screen.getByText("Bu şantiye kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın."),
    ).toBeInTheDocument();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});
