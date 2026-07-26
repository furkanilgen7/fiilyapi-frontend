import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ProjectFormModal } from "./ProjectFormModal";
import { useCreateProject } from "@/lib/api/hooks/useProjectMutations";

vi.mock("@/lib/api/hooks/useProjectMutations", () => ({ useCreateProject: vi.fn() }));

const mutate = vi.fn();

function setup() {
  vi.mocked(useCreateProject).mockReturnValue({ mutate, isPending: false } as never);
  render(<ProjectFormModal onClose={() => {}} />);
}

describe("ProjectFormModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("varsayilan tip taahhut: isveren alani var, satis hedefi yok", () => {
    setup();
    expect(screen.getByLabelText("İşveren")).toBeInTheDocument();
    expect(screen.queryByLabelText("Satış Hedefi")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Arsa Sahibi")).not.toBeInTheDocument();
  });

  it("tip degisince kosullu alanlar degisir", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kendi_yatirim" } });
    expect(screen.getByLabelText("Satış Hedefi")).toBeInTheDocument();
    expect(screen.getByLabelText("Arsa Maliyeti")).toBeInTheDocument();
    expect(screen.queryByLabelText("İşveren")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kat_karsiligi" } });
    expect(screen.getByLabelText("Arsa Sahibi")).toBeInTheDocument();
    expect(screen.getByLabelText("Bizim Pay (%)")).toBeInTheDocument();
    expect(screen.getByLabelText("Arsa Sahibi Payı (%)")).toBeInTheDocument();
  });

  it("kat karsiliginda pay toplami 100 degilse hata basar", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "BK-1" } });
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Bahçelievler" } });
    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kat_karsiligi" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi"), { target: { value: "Yılmaz Ailesi" } });
    fireEvent.change(screen.getByLabelText("Bizim Pay (%)"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi Payı (%)"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByText("Pay oranlarının toplamı 100 olmalıdır.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("gecerli kat karsiligi gonderiminde land_share gider", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Kod"), { target: { value: "BK-1" } });
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Bahçelievler" } });
    fireEvent.change(screen.getByLabelText("Tip"), { target: { value: "kat_karsiligi" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi"), { target: { value: "Yılmaz Ailesi" } });
    fireEvent.change(screen.getByLabelText("Bizim Pay (%)"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("Arsa Sahibi Payı (%)"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "BK-1",
        name: "Bahçelievler",
        project_type: "kat_karsiligi",
        land_share: expect.objectContaining({
          landowner_name: "Yılmaz Ailesi",
          our_share_pct: "55",
          owner_share_pct: "45",
        }),
      }),
      expect.anything(),
    );
  });
});
