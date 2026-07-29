import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProjectCreateView } from "./ProjectCreateView";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn() }),
}));

describe("ProjectCreateView — sayfa kabuğu (F5)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tek h1 ve kırıntı yolu render eder", () => {
    render(<ProjectCreateView />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Yeni Proje");
    expect(screen.getByText("Projeler", { selector: "a" })).toBeInTheDocument();
  });

  it("İptal /projeler'e döner", async () => {
    render(<ProjectCreateView />);
    // Alt eylem şeridindeki İptal
    const cancels = screen.getAllByRole("button", { name: "İptal" });
    await userEvent.click(cancels[0]);
    expect(nav.push).toHaveBeenCalledWith("/projeler");
  });

  it("Projeyi Oluştur ve Taslak Kaydet eylemleri görünür", () => {
    render(<ProjectCreateView />);
    expect(
      screen.getAllByRole("button", { name: "Projeyi Oluştur" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Taslak Kaydet" }),
    ).toBeInTheDocument();
  });
});
