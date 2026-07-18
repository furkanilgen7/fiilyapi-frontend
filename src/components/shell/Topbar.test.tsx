import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Topbar from "./Topbar";

vi.mock("./SessionProvider", () => ({
  useSession: () => ({ me: { full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }, isLoading: false }),
}));

describe("Topbar", () => {
  it("marka adini gosterir", () => {
    render(<Topbar />);
    expect(screen.getByText("FİİL")).toBeInTheDocument();
    expect(screen.getByText("YAPI")).toBeInTheDocument();
  });
  it("kullanici bas harflerini avatar'da gosterir", () => {
    render(<Topbar />);
    expect(screen.getByText("AY")).toBeInTheDocument();
  });
});
