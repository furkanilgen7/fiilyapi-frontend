import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

vi.mock("@/components/shell/SessionProvider", () => ({
  useSession: () => ({ me: { full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }, isLoading: false }),
}));

describe("HomePage (kabuk ici)", () => {
  it("kullanici adiyla karsilama gosterir", () => {
    render(<HomePage />);
    expect(screen.getByText(/Ahmet Yılmaz/)).toBeInTheDocument();
  });
  it("kendi cikis butonu YOK (cikis sidebar'da)", () => {
    render(<HomePage />);
    expect(screen.queryByRole("button", { name: /çıkış/i })).not.toBeInTheDocument();
  });
});
