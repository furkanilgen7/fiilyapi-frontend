import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";

const pushMock = vi.fn();
let currentPath = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => currentPath,
}));
vi.mock("./SessionProvider", () => ({
  useSession: () => ({ me: { full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }, isLoading: false }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
  currentPath = "/";
});

describe("Sidebar", () => {
  it("dort grup basligini ve nav ogelerini gosterir", () => {
    render(<Sidebar />);
    expect(screen.getByText("Genel")).toBeInTheDocument();
    expect(screen.getByText("Saha & İK")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gösterge Paneli/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Projeler/ })).toBeInTheDocument();
  });

  it("aktif rotayi vurgular (aria-current)", () => {
    currentPath = "/";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Gösterge Paneli/ })).toHaveAttribute("aria-current", "page");
  });

  it("prefix eslesmeyle alt rotayi aktif sayar", () => {
    currentPath = "/projeler/123";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Projeler/ })).toHaveAttribute("aria-current", "page");
  });

  it("kullanici adini gosterir ve cikis /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    render(<Sidebar />);
    expect(screen.getByText("Ahmet Yılmaz")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /çıkış/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
