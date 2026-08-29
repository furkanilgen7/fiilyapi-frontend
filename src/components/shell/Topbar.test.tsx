import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Topbar from "./Topbar";

vi.mock("./SessionProvider", () => ({
  useSession: () => ({ me: { full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }, isLoading: false }),
}));
// F-KIRINTI: üst çubuk artık yol göstergesi taşıyor, yani rotayı OKUYOR.
vi.mock("next/navigation", () => ({
  usePathname: () => "/projeler/gunesken-konut",
}));

function renderTopbar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Topbar />
    </QueryClientProvider>,
  );
}

describe("Topbar", () => {
  it("marka logosunu gosterir", () => {
    renderTopbar();
    expect(screen.getByAltText("FİİL YAPI İNŞAAT MİMARLIK SAN. TİC. A.Ş.")).toBeInTheDocument();
  });
  it("kullanici bas harflerini avatar'da gosterir", () => {
    renderTopbar();
    expect(screen.getByText("AY")).toBeInTheDocument();
  });

  it("kirinti LOGO ile EYLEMLER arasinda durur (mockup 33-41)", () => {
    // K1 — konum mockup'ın kendisidir; `flex` sırası DOM sırasıdır, yani
    // kırıntıyı yanlış kardeşin yanına koymak sessizce farklı bir çubuk çizer.
    const { container } = renderTopbar();
    const header = container.querySelector(".topbar");
    const order = [...(header?.children ?? [])].map((el) => el.className);
    expect(order).toEqual(["topbar-logo", "topbar-crumbs", "topbar-actions"]);
  });

  it("zil ve avatar kirintiyla birlikte yasar (52px seridi bozulmaz)", () => {
    renderTopbar();
    expect(screen.getByRole("button", { name: "Bildirimler" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Yol göstergesi" })).toBeInTheDocument();
  });
});
