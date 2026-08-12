import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { PersonnelFilterBar } from "./PersonnelFilterBar";

function setup(overrides: Partial<React.ComponentProps<typeof PersonnelFilterBar>> = {}) {
  const onQueryChange = vi.fn();
  const onTradeChange = vi.fn();
  const onStatusChange = vi.fn();
  render(
    <PersonnelFilterBar
      query=""
      trade={undefined}
      tradeOptions={["Elektrikçi", "Kalıpçı"]}
      status={undefined}
      onQueryChange={onQueryChange}
      onTradeChange={onTradeChange}
      onStatusChange={onStatusChange}
      {...overrides}
    />,
  );
  return { onQueryChange, onTradeChange, onStatusChange };
}

describe("PersonnelFilterBar", () => {
  it("arama kutusu değişikliği dışarı taşır (SUNUCUYA gidecek — spec)", () => {
    const { onQueryChange } = setup();
    fireEvent.change(screen.getByLabelText("Personel ara"), { target: { value: "mehmet" } });
    expect(onQueryChange).toHaveBeenCalledWith("mehmet");
  });

  it("proje süzgeci DEVRE-DIŞIdır ve gerekçesi görünür (backend süzgeci yok)", () => {
    setup();
    const projectFilter = screen.getByTestId("personel-filter-project");
    expect(projectFilter).toBeDisabled();
    expect(projectFilter).toHaveAttribute("title", expect.stringContaining("Proje süzgeci"));
  });

  it("meslek seçenekleri yüklenen kadrodan gelir ve seçim dışarı taşınır", () => {
    const { onTradeChange } = setup();
    const tradeSelect = screen.getByLabelText("Meslek filtresi");
    expect(screen.getByRole("option", { name: "Elektrikçi" })).toBeInTheDocument();
    fireEvent.change(tradeSelect, { target: { value: "Kalıpçı" } });
    expect(onTradeChange).toHaveBeenCalledWith("Kalıpçı");
  });

  it("durum süzgecinde 'İzinde' seçeneği BASILIR ama seçilemez (devre-dışı)", () => {
    setup();
    const onLeaveOption = screen.getByRole("option", { name: "İzinde" });
    expect(onLeaveOption).toBeDisabled();
  });

  it("durum süzgecinde Aktif/Pasif GERÇEKtir ve seçim dışarı taşınır", () => {
    const { onStatusChange } = setup();
    const statusSelect = screen.getByLabelText("Durum filtresi");
    fireEvent.change(statusSelect, { target: { value: "inactive" } });
    expect(onStatusChange).toHaveBeenCalledWith("inactive");
    fireEvent.change(statusSelect, { target: { value: "active" } });
    expect(onStatusChange).toHaveBeenCalledWith("active");
  });
});
