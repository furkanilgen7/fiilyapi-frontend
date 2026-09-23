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

  // 🔴 KAYIT NO 297 — bekci (a): BFF basarisiz donerse (403/500) KOSULSUZ
  // /login'e atilmamali — sunucu oturumu GERCEKTEN kapatmamis olabilir.
  // MUTASYON KANITI: `if (!res.ok) { ...; return; }` satiri silinirse bu test
  // KIRMIZI doner (pushMock cagrilir).
  it("cikis BFF basarisiz donerse /login'e ATILMAZ, hata gosterilir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 403 }));
    render(<Sidebar />);
    await userEvent.click(screen.getByRole("button", { name: /çıkış/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/tekrar deneyin/i));
    expect(pushMock).not.toHaveBeenCalled();
  });

  // 🔴 KAYIT NO 297 — bekci (b): ag hatasinda (fetch reddi) yakalanmamis bir
  // promise reddi OLMAMALI ve kullaniciya GORUNUR bir hata basilmali.
  // MUTASYON KANITI: `try/catch` kaldirilirsa bu test bir unhandled rejection
  // ile KIRMIZI doner.
  it("cikista ag hatasi olursa yakalanmamis reddi OLMAZ, hata gosterilir", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Sidebar />);
    await userEvent.click(screen.getByRole("button", { name: /çıkış/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/tekrar deneyin/i));
    expect(pushMock).not.toHaveBeenCalled();
  });
});
