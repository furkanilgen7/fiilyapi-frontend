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
  // 🔴 F-NAVSAHA · KULLANICI KARARI 2026-09-05 — `Saha & İK` başlığı İKİYE
  // ayrıldı (`Saha` + `İK`). Beklenti GEVŞETİLMEDİ: eskiden iki başlık
  // aranıyordu, şimdi BEŞİNİN HEPSİ DOM'da aranır, yani bir grup sessizce
  // düşerse test kırmızıya döner.
  it("bes grup basligini ve nav ogelerini gosterir", () => {
    render(<Sidebar />);
    for (const heading of ["Genel", "Saha", "İK", "Stok & Satınalma", "Sözleşme & Mali"]) {
      expect(screen.getByText(heading), `"${heading}" grup başlığı`).toBeInTheDocument();
    }
    // Ayrılan grupların öğeleri DOM'da gerçekten duruyor mu.
    expect(screen.getByRole("link", { name: /Gösterge Paneli/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Projeler/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Günlük Kayıt/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Personel/ })).toBeInTheDocument();
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

  // 🔴 F-UNIT1 T4 · ÇİFT AKTİFLİK BEKÇİSİ (DOM düzeyinde). `Çek & Ödeme`
  // nav'ın İLK iç içe href'idir; satır başına `isActivePath` çağıran eski
  // sürüm bu yolda `Hazine`yi de yakar ve aynı `<nav>` içinde İKİ
  // `aria-current="page"` basardı.
  it("ic ice rotada YALNIZ alt oge aktiftir (cift aria-current YOK)", () => {
    currentPath = "/hazine/cek-senet";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Çek & Ödeme/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /^Hazine$/ })).not.toHaveAttribute("aria-current");
    expect(
      screen.getAllByRole("link").filter((el) => el.getAttribute("aria-current") === "page"),
    ).toHaveLength(1);
  });

  it("kullanici adini gosterir ve cikis /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    render(<Sidebar />);
    expect(screen.getByText("Ahmet Yılmaz")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /çıkış/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
