import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EvSitePicker } from "./EvSitePicker";
import type { EvSiteOptionsState } from "@/lib/api/hooks/useEvSettings";

// PLN-F3.6a · Rapor ekranlarının ORTAK şantiye seçicisi.

const OPTIONS = [
  { siteId: "s-1", siteName: "A-Blok", projectId: "p-1", projectName: "Güneşkent", isCompleted: false },
  { siteId: "s-2", siteName: "Fabrika", projectId: "p-2", projectName: "Çelik OSB", isCompleted: true },
];

function state(overrides: Partial<EvSiteOptionsState> = {}): EvSiteOptionsState {
  return { options: OPTIONS, groups: [], isLoading: false, isError: false, ...overrides };
}

describe("EvSitePicker", () => {
  it("seçenekleri proje+şantiye etiketiyle basar; tamamlanmış şantiye işaretlenir", () => {
    render(<EvSitePicker state={state()} value="s-1" onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: "Güneşkent A-Blok" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Çelik OSB Fabrika · tamamlandı" })).toBeInTheDocument();
  });

  it("seçim değişince onChange çağrılır", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EvSitePicker state={state()} value="s-1" onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Şantiye"), "s-2");
    expect(onChange).toHaveBeenCalledWith("s-2");
  });

  it("ariaLabel özelleştirilebilir", () => {
    render(<EvSitePicker state={state()} value="s-1" onChange={vi.fn()} ariaLabel="Rapor şantiyesi" />);
    expect(screen.getByLabelText("Rapor şantiyesi")).toBeInTheDocument();
  });

  it("boş liste + yükleniyor → devre dışı, gerekçe basılmaz (yüklenirken)", () => {
    render(<EvSitePicker state={state({ options: [], isLoading: true })} value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Şantiye")).toBeDisabled();
    expect(screen.getByRole("option", { name: "Yükleniyor…" })).toBeInTheDocument();
  });

  it("boş liste + yüklenmedi + hata → hata gerekçesi", () => {
    render(<EvSitePicker state={state({ options: [], isError: true })} value="" onChange={vi.fn()} />);
    expect(screen.getByText("Şantiye listesi yüklenemedi.")).toBeInTheDocument();
  });

  it("boş liste + yüklenmedi + hata YOK → 'boş' gerekçesi (uydurma veri yok)", () => {
    render(<EvSitePicker state={state({ options: [] })} value="" onChange={vi.fn()} />);
    expect(screen.getByText("Planlaması olan şantiye bulunmuyor.")).toBeInTheDocument();
  });
});
